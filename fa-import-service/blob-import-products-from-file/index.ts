import { AzureFunction, Context } from "@azure/functions";
import { parse } from "csv-parse";
import { ServiceBusClient } from "@azure/service-bus";

const connectionString = process.env.SERVICEBUS_CONNECTION_STRING;
const topicName = "import-service-queue";

const acceptedFields = ['title', 'description', 'price', 'count'];

const cleanKey = (key) => key.replace(/^'|'$/g, '').trim();
const sanitizeField = (field) => field.trim();

const blobTrigger: AzureFunction = async function(context: Context, myBlob: Buffer): Promise<void> {

  const results: any[] = [];

  const parser = parse(myBlob.toString(), {
    columns: true,
    trim: true,
    delimiter: ';',
    quote: "'",
    escape: "\\"
  });

  parser.on('readable', () => {
    let record;
    while ((record = parser.read()) !== null) {
      const normalizedRecord = {};
      for (const key in record) {
        if (record.hasOwnProperty(key)) {
          const cleanKeyString = cleanKey(key.toLowerCase());
          if (acceptedFields.includes(cleanKeyString)) {
            normalizedRecord[cleanKeyString] = sanitizeField(record[key]);
          }
        }
      }
      results.push(normalizedRecord);
    }
  });

  parser.on('end', async () => {

    if (results.length === 0) {
      return;
    }

    const serviceBusClient = new ServiceBusClient(connectionString);
    const sender = serviceBusClient.createSender(topicName);

    try {
      const messages = results.map(record => ({
        body: record
      }));

      await sender.sendMessages(messages);
    } catch (err) {
    } finally {
      await sender.close();
      await serviceBusClient.close();
    }
  });

  parser.write(myBlob.toString());
  parser.end();

  await new Promise((resolve) => {
    parser.on('end', resolve);
  });
};

export default blobTrigger;

