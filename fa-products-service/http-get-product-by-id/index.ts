import { AzureFunction, Context, HttpRequest } from "@azure/functions";
import { CosmosClient } from "@azure/cosmos";
import { DATABASE_ID } from '../shared-data';

const endpoint = process.env.COSMOSDB_ENDPOINT;
const key = process.env.COSMOSDB_KEY;

const client = new CosmosClient({ endpoint, key });

const getProductsById: AzureFunction = async function(context: Context, req: HttpRequest): Promise<void> {
  const productId = req.params.productId;

  try {
    const database = client.database(DATABASE_ID.databaseId);

    const productContainer = database.container(DATABASE_ID.productContainerId);
    const { resource: product } = await productContainer.item(productId, productId).read();

    if (!product) {
      context.res = {
        status: 404,
        body: "Product not found"
      };
      return;
    }

    const stockContainer = database.container(DATABASE_ID.stockContainerId);
    const { resources: stockItems } = await stockContainer.items
      .query({
        query: "SELECT * FROM c WHERE c.product_id = @productId",
        parameters: [
          {
            name: "@productId",
            value: productId
          }
        ]
      })
      .fetchAll();

    const stock = stockItems[0];

    if (!stock) {
      context.res = {
        status: 404,
        body: "Stock not found"
      };
      return;
    }

    const combinedProduct = {
      id: product.id,
      title: product.title,
      description: product.description,
      price: product.price,
      count: stock.count
    };

    context.res = {
      status: 200,
      body: combinedProduct
    };
  } catch (error) {
    context.log.error("Error retrieving product:", error.message);
    context.res = {
      status: 500,
      body: "Internal server error"
    };
  }
};

export default getProductsById;

