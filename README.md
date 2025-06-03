# IntentGuardians

A full-stack tool for testing NLU (Natural Language Understanding) models built in Genesys Cloud by generating realistic utterances using open-source LLMs and verifying the model's recognition performance via Genesys APIs.

## Features

-   🔐 Authentication via Genesys Cloud's Implicit Grant OAuth flow
-   🤖 Select bot flows from your Genesys Cloud organization
-   🎯 Choose specific intents and languages to test
-   🧠 Generate realistic test utterances using LLM
-   📊 Run tests against Genesys Cloud NLU and analyze results
-   📈 Export test results in JSON or CSV format

## Project Structure

-   **Frontend**: React application with React Router and Tailwind CSS
-   **Backend**: Node.js server with Express

## Setup Instructions

### Prerequisites

-   Node.js (v14+)
-   npm or yarn
-   Genesys Cloud organization with OAuth client

### Backend Setup

1. Navigate to the backend directory:

    ```
    cd backend
    ```

2. Install dependencies:

    ```
    npm install
    ```

3. Create a `.env` file with the following variables:

    ```
    PORT=5000
    NODE_ENV=development
    GROQ_API_KEY=your_groq_api_key
    ```

4. Start the backend server:
    ```
    npm start
    ```

### Frontend Setup

1. Navigate to the frontend directory:

    ```
    cd frontend
    ```

2. Install dependencies:

    ```
    npm install
    ```

3. Start the frontend development server:
    ```
    npm start
    ```

## OAuth Client Setup in Genesys Cloud

1. In Genesys Cloud, go to Admin > Integrations > OAuth
2. Create a new OAuth client with the following settings:
    - Grant Type: Implicit Grant (Browser)
    - Redirect URI: `http://127.0.0.1:5000/intentguardians`
    - Scopes:
        - `conversation`
        - `architect:readonly`
        - `TODO: additional ones might be also needed`

## Usage

1. Open your browser and navigate to `http://localhost:3000`
2. Select your Genesys Cloud region and enter your OAuth client ID
3. Log in with your Genesys Cloud credentials
4. Follow the guided steps to test your NLU models
