import { AzureFunction, Context } from "@azure/functions";
import { parse } from "csv-parse";

const blobTrigger: AzureFunction = async function(context: Context, myBlob: Buffer): Promise<void> {
  context.log(`Processing blob\n Name: ${context.bindingData.blobTrigger}\n Size: ${myBlob.length} Bytes`);

  const results: any[] = [];

  const parser = parse(myBlob.toString(), {
    columns: true,
    trim: true
  });

  parser.on('readable', () => {
    let record;
    while ((record = parser.read()) !== null) {
      results.push(record);
    }
  });

  parser.on('end', () => {
    results.forEach(record => {
      context.log(`Parsed Record: ${JSON.stringify(record)}`);
    });
  });

  parser.on('error', (err) => {
    context.log(`Error parsing CSV: ${err.message}`);
  });

  parser.write(myBlob.toString());
  parser.end();
};

export default blobTrigger;

