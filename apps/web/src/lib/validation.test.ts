import { describe, expect, it } from "vitest";
import { validateFile, MAX_FILE_BYTES } from "./validation";
const file=(name:string,size:number)=>new File([new Uint8Array(size)],name);
describe("validateFile",()=>{
 it("accepts CSV/XLSX case-insensitively",()=>{expect(validateFile(file("data.CSV",1))).toBeNull();expect(validateFile(file("data.xlsx",1))).toBeNull();});
 it("rejects empty, unsupported and oversized files",()=>{expect(validateFile(file("data.csv",0))).toBe("empty_file");expect(validateFile(file("data.txt",1))).toBe("unsupported_format");expect(validateFile(file("data.csv",MAX_FILE_BYTES+1))).toBe("file_too_large_client");});
});
