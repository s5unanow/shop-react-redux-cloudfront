import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { CosmosClient } from "@azure/cosmos";
import { v4 as uuidv4 } from 'uuid';
import { DATABASE_ID } from '../shared-data';

const endpoint = process.env.COSMOSDB_ENDPOINT;
const key = process.env.COSMOSDB_KEY;

const client = new CosmosClient({ endpoint, key });

const httpPostProduct: AzureFunction = async function(context: Context, req: HttpRequest): Promise<void> {
  const product = req.body;

  if (!product || !product.title || !product.description || !product.price || !product.count) {
    context.res = {
      status: 400,
      body: "Invalid product data"
    };
    return;
  }

  product.id = uuidv4();

  const stock = {
    product_id: product.id,
    count: product.count
  };

  try {
    const database = client.database(DATABASE_ID.databaseId);
    const productContainer = database.container(DATABASE_ID.productContainerId);
    const stockContainer = database.container(DATABASE_ID.stockContainerId);

    const { resource: createdProduct } = await productContainer.items.create({
      id: product.id,
      title: product.title,
      description: product.description,
      price: product.price
    });

    const { resource: createdStock } = await stockContainer.items.create(stock);

    context.res = {
      status: 201,
      body: { product: createdProduct, stock: createdStock }
    };
  } catch (error) {
    context.log.error("Error creating product and stock:", error.message);
    context.res = {
      status: 500,
      body: "Internal server error"
    };
  }
};

export default httpPostProduct;

