import { CosmosClient } from "@azure/cosmos";
import dotenv from "dotenv";
import { faker } from "@faker-js/faker";

dotenv.config();

const endpoint = process.env.COSMOSDB_ENDPOINT;
const key = process.env.COSMOSDB_KEY;

const client = new CosmosClient({ endpoint, key });

const databaseId = "products-db";
const productContainerId = "products";
const stockContainerId = "stock";

async function createDatabase() {
  const { database } = await client.databases.createIfNotExists({
    id: databaseId,
  });
  console.log(`Created database:\n${database.id}\n`);
}

async function createContainers() {
  const { container: productContainer } = await client
    .database(databaseId)
    .containers.createIfNotExists({
      id: productContainerId,
      partitionKey: { kind: "Hash", paths: ["/id"] },
    });
  console.log(`Created container:\n${productContainer.id}\n`);

  const { container: stockContainer } = await client
    .database(databaseId)
    .containers.createIfNotExists({
      id: stockContainerId,
      partitionKey: { kind: "Hash", paths: ["/product_id"] },
    });
  console.log(`Created container:\n${stockContainer.id}\n`);
}

async function addItems() {
  const productContainer = client
    .database(databaseId)
    .container(productContainerId);
  const stockContainer = client
    .database(databaseId)
    .container(stockContainerId);

  for (let i = 0; i < 10; i++) {
    const productId = faker.datatype.uuid();
    const product = {
      id: productId,
      title: faker.commerce.productName(),
      description: faker.commerce.productDescription(),
      price: faker.datatype.number({ min: 10, max: 1000 }),
    };
    await productContainer.items.create(product);
    console.log(`Created product:\n${product.id}\n`);

    const stock = {
      product_id: productId,
      count: faker.datatype.number({ min: 0, max: 100 }),
    };
    await stockContainer.items.create(stock);
    console.log(`Created stock for product:\n${stock.product_id}\n`);
  }
}

async function main() {
  try {
    await createDatabase();
    await createContainers();
    await addItems();
  } catch (error) {
    console.error(error);
  }
}

main();
