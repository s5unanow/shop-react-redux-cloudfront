import React from "react";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";

type CSVFileImportProps = {
  url: string;
  title: string;
};

export default function CSVFileImport({ url, title }: CSVFileImportProps) {
  const [file, setFile] = React.useState<File>();

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      setFile(file);
    }
  };

  const removeFile = () => {
    setFile(undefined);
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      {!file ? (
        <input type="file" onChange={onFileChange} />
      ) : (
        <div>
          <button onClick={removeFile}>Remove file</button>
          <button onClick={() => uploadFile(file, url)}>Upload file</button>
        </div>
      )}
    </Box>
  );
}

async function uploadFile(file: File, url: string): Promise<void> {
  try {
    console.log("uploadFile to", url);

    // Get the pre-signed URL
    const response = await fetch(
      `${url}?name=${encodeURIComponent(file.name)}`,
      {
        method: "GET",
        headers: {
          "Ocp-Apim-Subscription-Key": "0b5b8d5535cf4c849c7eb19c6c02017f",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Error getting pre-signed URL: ${response.statusText}`);
    }

    const uploadUrl = await response.text();

    console.log("File to upload: ", file.name);
    console.log("Uploading to: ", uploadUrl);

    // Upload the file to the pre-signed URL
    const result = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type,
        "x-ms-blob-type": "BlockBlob",
      },
      body: file,
    });

    console.log("Result: ", result);
    if (result.ok) {
      console.log("File uploaded successfully.");
    } else {
      console.error("File upload failed.");
    }
  } catch (error) {
    console.error("Error uploading file:", error);
  }
};
