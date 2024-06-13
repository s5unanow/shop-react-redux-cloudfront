terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.107.0"
    }
  }
  required_version = ">= 1.0.0"
}

provider "azurerm" {
  features {}
}

variable "unique_resource_id_prefix" {
  type    = string
  default = "s5una"
}

variable "chatbot_container_name" {
  type    = string
  default = "hello-world-app"
}

variable "chatbot_container_tag_acr" {
  type    = string
  default = "v1"
}

resource "azurerm_resource_group" "chatbot_rg" {
  name     = "${var.unique_resource_id_prefix}-rg-chatbot-hello-world"
  location = "West Europe"
}

resource "azurerm_log_analytics_workspace" "chatbot_log_analytics_workspace" {
  name                = "${var.unique_resource_id_prefix}-log-analytics-chatbot"
  location            = azurerm_resource_group.chatbot_rg.location
  resource_group_name = azurerm_resource_group.chatbot_rg.name
  sku                 = "PerGB2018"
  
  depends_on = [
    azurerm_resource_group.chatbot_rg
  ]
}

resource "azurerm_container_app_environment" "chatbot_cae" {
  name                       = "${var.unique_resource_id_prefix}-cae-chatbot"
  location                   = azurerm_resource_group.chatbot_rg.location
  resource_group_name        = azurerm_resource_group.chatbot_rg.name
  log_analytics_workspace_id = azurerm_log_analytics_workspace.chatbot_log_analytics_workspace.id

  depends_on = [
    azurerm_log_analytics_workspace.chatbot_log_analytics_workspace
  ]
}

resource "azurerm_container_registry" "chatbot_acr" {
  name                = "${var.unique_resource_id_prefix}acr"
  location            = azurerm_resource_group.chatbot_rg.location
  resource_group_name = azurerm_resource_group.chatbot_rg.name
  sku                 = "Standard"
  admin_enabled       = true

  depends_on = [
    azurerm_resource_group.chatbot_rg
  ]
}

resource "azurerm_container_app" "chatbot_ca_docker_acr" {
  name                         = "${var.unique_resource_id_prefix}-chatbot-ca-acr"
  container_app_environment_id = azurerm_container_app_environment.chatbot_cae.id
  resource_group_name          = azurerm_resource_group.chatbot_rg.name
  revision_mode                = "Single"

  registry {
    server               = azurerm_container_registry.chatbot_acr.login_server
    username             = azurerm_container_registry.chatbot_acr.admin_username
    password_secret_name = "acr-password"
  }

  ingress {
    allow_insecure_connections = false
    external_enabled           = true
    target_port                = 3000

    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }

  template {
    container {
      name   = "${var.unique_resource_id_prefix}-chatbot-container-acr"
      image  = "${azurerm_container_registry.chatbot_acr.login_server}/${var.chatbot_container_name}:${var.chatbot_container_tag_acr}"
      cpu    = 0.25
      memory = "0.5Gi"

      env {
        name  = "CONTAINER_REGISTRY_NAME"
        value = "Azure Container Registry"
      }
    }
  }

  secret {
    name  = "acr-password"
    value = azurerm_container_registry.chatbot_acr.admin_password
  }

  depends_on = [
    azurerm_container_app_environment.chatbot_cae,
    azurerm_container_registry.chatbot_acr
  ]
}
