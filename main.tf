terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
        version = "~> 3.92.0"
      }
    }

    required_version = ">= 1.1.0"
  }

provider "azurerm" {
  features {}
}
#task2
resource "azurerm_resource_group" "front_end_rg" {
    name     = "rg-frontend-sand-ne-001"
    location = "northeurope"
}

resource "azurerm_storage_account" "front_end_storage_account" {
  name                     = "stgsandfrontendnes5una"
  location                 = "northeurope"

  account_replication_type = "LRS"
  account_tier             = "Standard"
  account_kind             = "StorageV2"
  resource_group_name      = azurerm_resource_group.front_end_rg.name

  static_website {
    index_document = "index.html"
  }
}
#task3
resource "azurerm_resource_group" "product_service_rg" {
  location = "northeurope"
  name     = "rg-product-service-sand-ne-001"
}

resource "azurerm_storage_account" "products_service_fa" {
  name     = "stgsangproductsfanes5una"
  location = "northeurope"

  account_replication_type = "LRS"
  account_tier             = "Standard"
  account_kind             = "StorageV2"

  resource_group_name = azurerm_resource_group.product_service_rg.name
}

resource "azurerm_storage_share" "products_service_fa" {
  name  = "fa-products-service-share"
  quota = 2

  storage_account_name = azurerm_storage_account.products_service_fa.name
}

resource "azurerm_service_plan" "product_service_plan" {
  name     = "asp-product-service-sand-ne-001"
  location = "northeurope"

  os_type  = "Windows"
  sku_name = "Y1"

  resource_group_name = azurerm_resource_group.product_service_rg.name
}

resource "azurerm_application_insights" "products_service_fa" {
  name             = "appins-fa-products-service-sand-ne-001"
  application_type = "web"
  location         = "northeurope"


  resource_group_name = azurerm_resource_group.product_service_rg.name
}


resource "azurerm_windows_function_app" "products_service" {
  name     = "fa-products-service-ne-001-s5una"
  location = "northeurope"

  service_plan_id     = azurerm_service_plan.product_service_plan.id
  resource_group_name = azurerm_resource_group.product_service_rg.name

  storage_account_name       = azurerm_storage_account.products_service_fa.name
  storage_account_access_key = azurerm_storage_account.products_service_fa.primary_access_key

  functions_extension_version = "~4"
  builtin_logging_enabled     = false

  site_config {
    always_on = false

    application_insights_key               = azurerm_application_insights.products_service_fa.instrumentation_key
    application_insights_connection_string = azurerm_application_insights.products_service_fa.connection_string

    # For production systems set this to false, but consumption plan supports only 32bit workers
    use_32_bit_worker = true

    # Enable function invocations from Azure Portal.
    cors {
      allowed_origins = ["https://portal.azure.com"]
    }

    application_stack {
      node_version = "~16"
    }
  }

  app_settings = {
    WEBSITE_CONTENTAZUREFILECONNECTIONSTRING = azurerm_storage_account.products_service_fa.primary_connection_string
    WEBSITE_CONTENTSHARE                     = azurerm_storage_share.products_service_fa.name
  }

  # The app settings changes cause downtime on the Function App. e.g. with Azure Function App Slots
  # Therefore it is better to ignore those changes and manage app settings separately off the Terraform.
  lifecycle {
    ignore_changes = [
      app_settings,
      site_config["application_stack"], // workaround for a bug when azure just "kills" your app
      tags["hidden-link: /app-insights-instrumentation-key"],
      tags["hidden-link: /app-insights-resource-id"],
      tags["hidden-link: /app-insights-conn-string"]
    ]
  }
}

#task 4

# Define the CosmosDB account
resource "azurerm_cosmosdb_account" "test_app" {
  location            = "northeurope"
  name                = "cos-app-sand-ne-s5una-001"
  offer_type          = "Standard"
  resource_group_name = azurerm_resource_group.product_service_rg.name
  kind                = "GlobalDocumentDB"

  consistency_policy {
    consistency_level = "Eventual"
  }

  capabilities {
    name = "EnableServerless"
  }

  geo_location {
    failover_priority = 0
    location          = "North Europe"
  }
}

# Define the CosmosDB database
resource "azurerm_cosmosdb_sql_database" "products_app" {
  account_name        = azurerm_cosmosdb_account.test_app.name
  name                = "products-db"
  resource_group_name = azurerm_resource_group.product_service_rg.name
}

# Define the Products collection
resource "azurerm_cosmosdb_sql_container" "products" {
  account_name        = azurerm_cosmosdb_account.test_app.name
  database_name       = azurerm_cosmosdb_sql_database.products_app.name
  name                = "products"
  partition_key_path  = "/id"
  resource_group_name = azurerm_resource_group.product_service_rg.name

  default_ttl = -1

  indexing_policy {
    excluded_path {
      path = "/*"
    }
  }
}

# Define the Stock collection
resource "azurerm_cosmosdb_sql_container" "stock" {
  account_name        = azurerm_cosmosdb_account.test_app.name
  database_name       = azurerm_cosmosdb_sql_database.products_app.name
  name                = "stock"
  partition_key_path  = "/product_id"
  resource_group_name = azurerm_resource_group.product_service_rg.name

  default_ttl = -1

  indexing_policy {
    excluded_path {
      path = "/*"
    }
  }
}

