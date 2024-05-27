import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { CosmosClient } from "@azure/cosmos";
import { DATABASE_ID } from '../shared-data';

const endpoint = process.env.COSMOSDB_ENDPOINT;
const key = process.env.COSMOSDB_KEY;

const client = new CosmosClient({ endpoint, key });

const getProducts: AzureFunction = async function(
  context: Context,
  req: HttpRequest
): Promise<void> {
  try {
    const productContainer = client.database(DATABASE_ID.databaseId).container(DATABASE_ID.productContainerId);
    const stockContainer = client.database(DATABASE_ID.databaseId).container(DATABASE_ID.stockContainerId);

    const { resources: products } = await productContainer.items.query("SELECT * FROM c").fetchAll();
    const { resources: stocks } = await stockContainer.items.query("SELECT * FROM c").fetchAll();

    const productsWithStock = products.map((product) => {
      const stock = stocks.find((s) => s.product_id === product.id) || { count: 0 };
      return {
        id: product.id,
        title: product.title,
        description: product.description,
        price: product.price,
        count: stock.count,
      };
    });

    context.res = {
      status: 200,
      body: productsWithStock,
    };
  } catch (error) {
    context.res = {
      status: 500,
      body: `Error: ${error.message}`,
    };
  }
};

export default getProducts;

