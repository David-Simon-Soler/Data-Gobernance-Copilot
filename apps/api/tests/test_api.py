import json
from fastapi.testclient import TestClient
from app.main import app

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

def test_request_and_file_limits():
    r=client.post('/api/v1/analyze',content=b'x'*(6*1024*1024+1),headers={'content-type':'application/octet-stream'}); assert r.status_code==413
    r=client.post('/api/v1/analyze',files={'file':('x.csv',b'x'*(5*1024*1024+1),'text/csv')}); assert r.status_code==413

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
