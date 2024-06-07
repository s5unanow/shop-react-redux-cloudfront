import { AzureFunction, Context } from "@azure/functions";
import { CosmosClient, OperationInput } from "@azure/cosmos";
import { v4 as uuidv4 } from 'uuid';
import { DATABASE_ID } from '../shared-data';

const endpoint = process.env.COSMOSDB_ENDPOINT;
const key = process.env.COSMOSDB_KEY;

const client = new CosmosClient({ endpoint, key });

const serviceBusImportProduct: AzureFunction = async function(context: Context, mySbMsg: any): Promise<void> {
  const product = mySbMsg;

  if (!product || typeof product !== 'object') {
    context.log.error("Invalid product data in message:", product);
    return;
  }
  context.log("Received product from Service Bus:", product);

  try {
    const database = client.database(DATABASE_ID.databaseId);
    const productContainer = database.container(DATABASE_ID.productContainerId);
    const stockContainer = database.container(DATABASE_ID.stockContainerId);

    product.id = uuidv4();

    await productContainer.items.create({
      id: product.id,
      title: product.title,
      description: product.description,
      price: product.price
    });

    // Create stock item
    await stockContainer.items.create({
      product_id: product.id,
      count: product.count
    });

    context.log(`Created product with ID: ${product.id} and its stock entry.`);
  } catch (error) {
    context.log.error("Error creating product and stock:", error.message);
  }
};

export default serviceBusImportProduct;

