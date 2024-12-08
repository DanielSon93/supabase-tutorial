import { useState } from "react";
import "./App.css";
import { v4 as uuid4 } from "uuid";
import { supabase } from "./config";

/**
 * 구현 계획 1
 * 1. multiple을 사용한 다중 파일 업로드
 * 2. 선택한 파일 미리보기 기능
 * 3. supabase storage bucket에 파일 업로드
 * 4. database에 파일명, 파일 Url 업로드
 *
 * 구현 계획 2
 * 1. database에서 파일명, 파일 Url 가져오기
 * 2. 해당 url로 bucket에서 파일 가져오기
 * 3. 가져온 파일 보여주기
 *
 * database table, storage bucket 이름
 * database table 이름 : file-table
 * storage bucket 이름 : file-bucket
 */
function App() {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [downloadFiles, setDownloadFiles] = useState<string[]>([]);

  // 파일 업로드, 미리보기 기능
  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    // 파일 데이터
    const selectedFiles = Array.from(e.target.files);
    setFiles(selectedFiles);

    // 미리보기 Url
    const previewUrls = selectedFiles.map((file) => URL.createObjectURL(file));
    setPreviews(previewUrls);
  };

  // supabase storage bucket, supabase database table에 파일 업로드
  const handleFilesUpload = async () => {
    for (const file of files) {
      const fileName = `${uuid4()}-${file.name}`;

      // storage bucket에 파일 업로드
      const { data: bucketUploadData, error: bucketUploadError } =
        await supabase.storage.from("file-bucket").upload(fileName, file);

      if (bucketUploadError) {
        console.log(bucketUploadData);
        return;
      }

      // database table에 파일 정보 저장
      const { error: tableUploadError } = await supabase
        .from("file-table")
        .insert({
          file_url: fileName,
          file_name: file.name,
        });

      if (tableUploadError) {
        console.log(tableUploadError);
        return;
      }
    }
  };

  const handleFileDownload = async () => {
    // database table에서 파일 정보 조회
    const { data: tableDownloadData, error: tableDownloadError } =
      await supabase.from("file-table").select().eq("user_id", 1);

    if (tableDownloadError) {
      console.log(tableDownloadError);
      return;
    }

    if (tableDownloadData) {
      // storage bucket에서 파일 다운로드, 미리보기
      for (const tableData of tableDownloadData) {
        const { data: bucketDownloadData, error: bucketDownloadError } =
          await supabase.storage
            .from("file-bucket")
            .download(tableData.file_url as string);

        if (bucketDownloadError) {
          console.log(bucketDownloadError);
          return;
        }

        setDownloadFiles((prevFiles) => [
          ...prevFiles,
          URL.createObjectURL(bucketDownloadData),
        ]);
      }
    }
  };

  return (
    <div>
      <form>
        <div className="flex flex-col justify-center gap-4">
          <input
            id="input-file"
            className="hidden"
            type="file"
            onChange={handleFiles}
            accept="image/*"
            multiple
          />
          <label
            htmlFor="input-file"
            className="cursor-pointer border border-dashed rounded-md p-3 hover:scale-110 transition duration-200"
          >
            Select Files
          </label>
          <div className="flex gap-4">
            {previews &&
              previews.map((preview) => (
                <img
                  key={uuid4()}
                  src={preview}
                  alt="preview-img"
                  className="w-32 h-32"
                />
              ))}
          </div>
          <button type="submit" onClick={handleFilesUpload}>
            Upload Files
          </button>
        </div>

        <div className="mt-10">
          <div className="flex gap-4">
            {downloadFiles &&
              downloadFiles.map((file) => (
                <img src={file} alt="preview-img" className="w-32 h-32" />
              ))}
          </div>
          <div
            className="cursor-pointer border border-dashed rounded-md p-3 hover:scale-110 transition duration-200"
            onClick={handleFileDownload}
          >
            Download Files
          </div>
        </div>
      </form>
    </div>
  );
}

export default App;
