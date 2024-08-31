# Telegram Bot with PKP and Lit Protocol Integration

This project is a NestJS-based application that integrates Telegram Bot functionality with PKP (Programmable Key Pairs) and Lit Protocol. It provides features such as validating Telegram data, creating PKPs, managing payers and payees, handling authentication signatures, and serving NFT metadata.

## Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [API Endpoints](#api-endpoints)

## Features

- Validate Telegram data
- Create PKPs (Programmable Key Pairs) for Telegram users
- Retrieve PKPs associated with Telegram users
- Register payers and manage payees
- Handle authentication signatures for payers
- Serve NFT metadata based on the XLS-24d standard

## Prerequisites

- Node.js
- pnpm package manager
- Telegram Bot Token (do not need if you are not using Telegram Authentication and ENV=dev)
- EOA wallet funded with Lit faucet

## Installation

Install dependencies:

```bash
pnpm install
```

## Configuration

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit the `.env` file and add your configuration:
   ```
   TELEGRAM_BOT_TOKEN=your_telegram_bot_token
   EOA_PRIVATE_KEY=your_private_key
   ENV=dev
   ```

3. Obtain Lit tokens:
   - Visit the [Lit Protocol Faucet](https://chronicle-yellowstone-faucet.getlit.dev/)
   - Faucet Lit tokens to your EOA (Externally Owned Account)

## Running the Application

```bash
# Development mode
pnpm run start

# Watch mode
pnpm run start:dev

# Production mode
pnpm run start:prod
```

## API Endpoints

Swagger documentation is available at:
- Local: http://localhost:3001/api
- Production: https://iampocket-relay-server.vercel.app/api

The application exposes the following endpoints:

- `GET /` - Hello world endpoint
- `POST /telegram/validate` - Validate Telegram data with PKP token ID
- `POST /telegram/create-pkp` - Create a PKP for a Telegram user
- `POST /telegram/get-pkps` - Get PKPs for a Telegram user
- `POST /register-payer` - Register a new payer
- `POST /add-payee` - Add a new payee
- `POST /payer-authsig` - Get authentication signature for a payer
- `GET /nft/maru` - Get NFT metadata based on XLS-24d standard
- `GET /nft/maru-sleeping` - Get NFT metadata for sleeping Maru
- `GET /nft/maru-glasses` - Get NFT metadata for Maru with glasses

For detailed information on request/response formats, please refer to the Swagger documentation or the `AppController` class in the source code.

## NFT Metadata Standard

This project implements the XLS-24d standard for NFT metadata. For more information, visit the [XRPL Standards Discussion](https://github.com/XRPLF/XRPL-Standards/discussions/69).

