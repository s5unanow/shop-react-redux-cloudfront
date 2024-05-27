import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { BlobServiceClient, generateBlobSASQueryParameters, StorageSharedKeyCredential, SASProtocol, BlobSASPermissions } from "@azure/storage-blob";
import { v4 as uuidv4 } from "uuid";

const httpTrigger: AzureFunction = async function(context: Context, req: HttpRequest): Promise<void> {
  const name = req.query.name || (req.body && req.body.name);
  if (!name) {
    context.res = {
      status: 400,
      body: "Please pass a name on the query string or in the request body"
    };
    return;
  }

  const accountName = process.env["STORAGE_ACCOUNT_NAME"];
  const accountKey = process.env["STORAGE_ACCOUNT_KEY"];
  const containerName = "uploaded";

  if (!accountName || !accountKey) {
    context.res = {
      status: 500,
      body: "Storage account name or key is missing from environment variables"
    };
    return;
  }

  const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
  const blobServiceClient = new BlobServiceClient(
    `https://${accountName}.blob.core.windows.net`,
    sharedKeyCredential
  );

  const containerClient = blobServiceClient.getContainerClient(containerName);

  // Create the container if it doesn't exist
  const createContainerResponse = await containerClient.createIfNotExists();
  if (createContainerResponse.succeeded) {
    context.log(`Container ${containerName} created successfully`);
  }

  const blobName = `${uuidv4()}-${name}`;
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  const sasPermissions = new BlobSASPermissions();
  sasPermissions.write = true;

  const sasToken = generateBlobSASQueryParameters(
    {
      containerName: containerName,
      blobName: blobName,
      permissions: sasPermissions,
      protocol: SASProtocol.Https,
      startsOn: new Date(),
      expiresOn: new Date(new Date().valueOf() + 3600 * 1000)
    },
    sharedKeyCredential
  ).toString();

  const sasUrl = `${blockBlobClient.url}?${sasToken}`;

  context.res = {
    body: sasUrl
  };
};

export default httpTrigger;

