# Pact Broker Configuration
# This file documents the Pact Broker integration setup

## Environment Variables Required

### For Consumer (Frontend)
# PACT_BROKER_BASE_URL - The URL of your Pact Broker instance
# PACT_BROKER_TOKEN - Authentication token for the Pact Broker

### For Provider (Backend)
# PACT_BROKER_BASE_URL - The URL of your Pact Broker instance
# PACT_BROKER_TOKEN - Authentication token for the Pact Broker
# GIT_COMMIT - Current Git commit SHA (used as provider version)
# GIT_BRANCH - Current Git branch name

## Pact Broker Setup Options

### Option 1: Pactflow (Recommended for production)
# Sign up at https://pactflow.io/
# - Managed service with built-in security
# - Advanced features like webhooks, can-i-deploy checks
# - Integration with CI/CD pipelines

### Option 2: Self-hosted Pact Broker
# Docker Compose setup:
# ```yaml
# version: '3'
# services:
#   postgres:
#     image: postgres:15
#     environment:
#       POSTGRES_USER: pact
#       POSTGRES_PASSWORD: pact
#       POSTGRES_DB: pact
#     volumes:
#       - pact-db:/var/lib/postgresql/data
#
#   pact-broker:
#     image: pactfoundation/pact-broker
#     ports:
#       - "9292:9292"
#     environment:
#       PACT_BROKER_DATABASE_URL: postgres://pact:pact@postgres/pact
#       PACT_BROKER_BASIC_AUTH_USERNAME: admin
#       PACT_BROKER_BASIC_AUTH_PASSWORD: admin
#     depends_on:
#       - postgres
#
# volumes:
#   pact-db:
# ```

## Consumer Version Selectors

# The provider verification uses these selectors to determine which
# consumer pacts to verify against:

# - mainBranch: true - Verify against the main/master branch
# - deployedOrReleased: true - Verify against deployed/released versions
# - consumer: 'BMS-Frontend' - Specific consumer to verify

## Webhooks (Optional)

# Configure webhooks in Pact Broker to:
# - Trigger provider verification when consumer publishes new pacts
# - Notify team when contracts break
# - Update GitHub PR status

## Can-I-Deploy

# Use can-i-deploy to check if it's safe to deploy:
# ```bash
# pact-broker can-i-deploy \
#   --pacticipant BMS-Frontend \
#   --version <git-sha> \
#   --to-environment production
# ```

## Recording Deployments

# Record successful deployments to track what's in production:
# ```bash
# pact-broker record-deployment \
#   --pacticipant BMS-Backend \
#   --version <git-sha> \
#   --environment production
# ```
