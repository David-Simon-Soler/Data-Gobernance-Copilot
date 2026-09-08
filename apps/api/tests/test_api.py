import asyncio
import json
from io import BytesIO
from zipfile import ZIP_DEFLATED, ZipFile
from fastapi.testclient import TestClient
from app.main import MAX_HTTP_BODY, RequestSizeLimitMiddleware, app
from app.ingestion.errors import DatasetLimitError

client=TestClient(app)

def test_health_exact():
    r=client.get('/health'); assert r.status_code==200 and r.json()=={'status':'ok'}

def test_analyze_csv_complete_and_safe():
    raw=b'customer_id,email\nid-1,alice@example.test\n'
    r=client.post('/api/v1/analyze',files={'file':('customers.csv',raw,'application/octet-stream')})
    assert r.status_code==200; body=r.json(); assert body['schema_version']=='0.1'; assert set(body['analysis'])=={'profiling','quality','governance','recommendations'}; assert body['metadata']['warnings']==[]; assert 'alice@example.test' not in json.dumps(body)

def test_csv_sheet_name_rejected_and_empty_accepted():
    f={'file':('x.csv',b'a\n1\n','text/plain')}
    assert client.post('/api/v1/analyze',files=f,data={'sheet_name':'Sheet'}).json()['error']['code']=='sheet_not_applicable'
    assert client.post('/api/v1/analyze',files=f,data={'sheet_name':''}).status_code==200

def test_missing_file_is_safe_422():
    r=client.post('/api/v1/analyze'); assert r.status_code==422 and r.json()=={'error':{'code':'invalid_request','message':'The request does not match the expected API contract.'}}

def test_filename_and_format_errors():
    r=client.post('/api/v1/analyze',files={'file':('x.txt',b'hello','text/plain')}); assert r.status_code==415 and r.json()['error']['code']=='unsupported_format'
    r=client.post('/api/v1/analyze',files={'file':('',b'a,b\n1,2\n','text/csv')}); assert r.status_code in (400,422)
    r=client.post('/api/v1/analyze',files={'file':('empty.csv',b'','text/csv')})
    assert r.status_code==400 and r.json()['error']['code']=='empty_dataset'
    r=client.post('/api/v1/analyze',files={'file':('malformed.csv',b'id,value\n1,SECRET_CSV_VALUE,extra\n','text/csv')})
    assert r.status_code==400 and r.json()['error']['code']=='malformed_dataset'
    assert 'SECRET_CSV_VALUE' not in r.text

def test_request_and_file_limits():
    r=client.post('/api/v1/analyze',content=b'x'*(6*1024*1024+1),headers={'content-type':'application/octet-stream'}); assert r.status_code==413 and r.json()['error']['code']=='request_too_large'
    r=client.post('/api/v1/analyze',files={'file':('x.csv',b'x'*(5*1024*1024+1),'text/csv')}); assert r.status_code==413

def test_dataset_limit_error_is_safe_400(monkeypatch):
    def exceed_dataset_limit(*args, **kwargs):
        raise DatasetLimitError('SECRET_DATASET_VALUE')
    monkeypatch.setattr('app.main.analyze_dataset', exceed_dataset_limit)
    r=client.post('/api/v1/analyze',files={'file':('x.csv',b'a\n1\n','text/csv')})
    assert r.status_code==400
    assert r.json()=={'error':{'code':'dataset_limit_exceeded','message':'The uploaded dataset could not be processed.'}}
    assert 'SECRET_DATASET_VALUE' not in r.text

def test_xlsx_sheet_selection_and_unknown(xlsx_bytes):
    payload=xlsx_bytes({'First':[['a'],[1]],'Second':[['b'],[2]]})
    assert client.post('/api/v1/analyze',files={'file':('x.xlsx',payload,'application/octet-stream')},data={'sheet_name':'Second'}).json()['metadata']['sheet_name']=='Second'
    r=client.post('/api/v1/analyze',files={'file':('x.xlsx',payload,'application/octet-stream')},data={'sheet_name':'Missing'}); assert r.status_code==400 and r.json()['error']['code']=='sheet_not_found'

def test_xlsx_default_selection(xlsx_bytes):
    payload=xlsx_bytes({'First':[['a'],[1]]}); r=client.post('/api/v1/analyze',files={'file':('x.xlsx',payload,'application/octet-stream')}); assert r.status_code==200 and r.json()['metadata']['sheet_name']=='First'

def test_cors_explicit():
    assert client.get('/health',headers={'Origin':'http://localhost:3000'}).headers.get('access-control-allow-origin')=='http://localhost:3000'
    assert 'access-control-allow-origin' not in client.get('/health',headers={'Origin':'https://evil.test'}).headers

def test_deterministic_repeated_response():
    f={'file':('x.csv',b'a,b\n1,2\n','text/csv')}; assert client.post('/api/v1/analyze',files=f).json()==client.post('/api/v1/analyze',files=f).json()

def test_internal_error_is_safe(monkeypatch):
    def fail(*args,**kwargs): raise RuntimeError('SECRET_INTERNAL_VALUE /home/private/path alice@example.test')
    monkeypatch.setattr('app.main.analyze_dataset',fail)
    r=TestClient(app, raise_server_exceptions=False).post('/api/v1/analyze',files={'file':('x.csv',b'a\n1\n','text/csv')}); assert r.status_code==500; text=r.text; assert 'internal_error' in text and 'SECRET_INTERNAL_VALUE' not in text and '/home/private/path' not in text


def test_request_size_limit_enforces_declared_and_streamed_boundaries() -> None:
    assert MAX_HTTP_BODY == 6 * 1024 * 1024

    async def exercise(headers, chunks):
        downstream_completed = False
        sent = []
        index = 0

        async def downstream(scope, receive, send):
            nonlocal downstream_completed
            while True:
                message = await receive()
                if not message.get("more_body", False):
                    break
            downstream_completed = True
            await send({"type": "http.response.start", "status": 204, "headers": []})
            await send({"type": "http.response.body", "body": b""})

        async def receive():
            nonlocal index
            body = chunks[index] if index < len(chunks) else b""
            index += 1
            return {
                "type": "http.request",
                "body": body,
                "more_body": index < len(chunks),
            }

        scope = {
            "type": "http",
            "asgi": {"version": "3.0"},
            "http_version": "1.1",
            "method": "POST",
            "scheme": "http",
            "path": "/api/v1/analyze",
            "raw_path": b"/api/v1/analyze",
            "query_string": b"",
            "headers": headers,
            "client": ("testclient", 1),
            "server": ("testserver", 80),
        }
        async def send(message):
            sent.append(message)

        middleware = RequestSizeLimitMiddleware(downstream, MAX_HTTP_BODY)
        await middleware(scope, receive, send)
        return downstream_completed, sent

    exact = [b"x" * (3 * 1024 * 1024), b"x" * (3 * 1024 * 1024)]
    completed, sent = asyncio.run(exercise([], exact))
    assert completed is True
    assert sent[0]["status"] == 204

    completed, sent = asyncio.run(exercise([], [*exact, b"x"]))
    assert completed is False
    assert sent[0]["status"] == 413
    assert json.loads(sent[1]["body"]) == {
        "error": {
            "code": "request_too_large",
            "message": "The HTTP request exceeds the configured size limit.",
        }
    }

    declared_over = [(b"content-length", str(MAX_HTTP_BODY + 1).encode())]
    completed, sent = asyncio.run(exercise(declared_over, []))
    assert completed is False
    assert sent[0]["status"] == 413


def test_malformed_xlsx_xml_maps_to_safe_deterministic_400(xlsx_bytes) -> None:
    source = xlsx_bytes({"Data": [["id"], [1]]})
    output = BytesIO()
    with ZipFile(BytesIO(source)) as source_archive, ZipFile(output, "w", ZIP_DEFLATED) as target:
        for info in source_archive.infolist():
            payload = source_archive.read(info.filename)
            if info.filename == "xl/worksheets/sheet1.xml":
                payload = b"<worksheet><SECRET_XML"
            target.writestr(info, payload)

    response = client.post(
        "/api/v1/analyze",
        files={"file": ("malformed.xlsx", output.getvalue(), "application/octet-stream")},
    )
    assert response.status_code == 400
    assert response.json() == {
        "error": {
            "code": "malformed_dataset",
            "message": "The uploaded dataset could not be processed.",
        }
    }
    assert "SECRET_XML" not in response.text
