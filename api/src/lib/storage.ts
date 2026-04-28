import { BlobServiceClient } from "@azure/storage-blob";

export async function uploadInvoiceBlob(fileName: string, buffer: Buffer, contentType: string) {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connectionString) return undefined;

  const containerName = process.env.AZURE_STORAGE_CONTAINER ?? "invoices";
  const service = BlobServiceClient.fromConnectionString(connectionString);
  const container = service.getContainerClient(containerName);
  await container.createIfNotExists();

  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const blobName = `${new Date().toISOString().slice(0, 10)}/${Date.now()}-${safeName}`;
  const blob = container.getBlockBlobClient(blobName);
  await blob.uploadData(buffer, {
    blobHTTPHeaders: {
      blobContentType: contentType,
    },
    metadata: {
      source: "financepro",
      originalName: safeName.slice(0, 128),
    },
  });

  return {
    container: containerName,
    blobName,
    url: blob.url,
  };
}
