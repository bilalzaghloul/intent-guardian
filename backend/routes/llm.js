const express = require('express');
const router = express.Router();
const axios = require('axios');
const path = require('path');
const fs = require('fs');
// Authentication is now handled by sessionMiddleware in server.js

/**
 * @route   POST /api/llm/generate-tests
 * @desc    Generate test utterances using LLM
 * @access  Private
 */
router.post('/generate-tests', async (req, res) => {
    // Direct output to ensure it's visible
    process.stdout.write('\n\n***** LLM GENERATE TESTS ENDPOINT CALLED *****\n');

    // Create a debug log file regardless of what happens
    try {
        const debugDir = path.join(__dirname, '..', 'debug-logs');
        if (!fs.existsSync(debugDir)) {
            fs.mkdirSync(debugDir, { recursive: true });
        }

        const debugFile = path.join(debugDir, `llm-debug-${Date.now()}.log`);
        fs.writeFileSync(
            debugFile,
            `LLM endpoint called at ${new Date().toISOString()}\n\nRequest body: ${JSON.stringify(
                req.body,
                null,
                2
            )}\n\n`
        );
        process.stdout.write(`Debug log created at: ${debugFile}\n`);
    } catch (debugErr) {
        process.stdout.write(`Failed to create debug log: ${debugErr.message}\n`);
    }
    try {
        const { intents, language } = req.body;

        if (!intents || !language) {
            return res.status(400).json({
                success: false,
                message: 'Intents and language are required',
            });
        }

        // Get LLM API key from environment variables
        const llmApiKey = process.env.GROQ_API_KEY || process.env.LLM_API_KEY;

        if (!llmApiKey) {
            return res.status(500).json({
                success: false,
                message: 'LLM API key is not configured',
            });
        }

        // Prepare prompt for LLM

        const prompt = generatePrompt(intents, language);
        console.log(prompt);

        // Call Groq API with Deepseek model
        const llmResponse = await axios.post(
            'https://api.groq.com/openai/v1/chat/completions',
            {
                model: 'llama-3.3-70b-versatile',
                messages: [
                    {
                        role: 'user',
                        content: prompt,
                    },
                ],
                temperature: 0.7,
                max_tokens: 4000,
                response_format: { type: 'json_object' },
            },
            {
                headers: {
                    Authorization: `Bearer ${llmApiKey}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        // Parse LLM response
        let testUtterances;
        try {
            // Extract JSON from LLM response
            const content = llmResponse.data.choices[0].message.content;
            const parsedContent = JSON.parse(content);

            // Validate response format
            if (!parsedContent.utterances || !Array.isArray(parsedContent.utterances)) {
                // Try to handle different response formats
                if (Array.isArray(parsedContent)) {
                    // If the response is a direct array
                    testUtterances = { utterances: parsedContent };
                } else {
                    throw new Error('Invalid response format from LLM');
                }
            } else {
                testUtterances = parsedContent;
            }

            // Additional validation of utterance objects
            testUtterances.utterances.forEach((utterance) => {
                if (!utterance.text || !utterance.expected_intent) {
                    console.warn('Incomplete utterance object:', utterance);
                    // Fix missing properties
                    utterance.text = utterance.text || utterance.utterance || 'Missing text';
                    utterance.expected_intent = utterance.expected_intent || utterance.intent || 'unknown';
                    utterance.expected_slots = utterance.expected_slots || utterance.slots || {};
                }
            });
        } catch (parseError) {
            console.error('Error parsing LLM response:', parseError);
            console.error('Raw content:', llmResponse.data.choices[0].message.content);
            return res.status(500).json({
                success: false,
                message: 'Failed to parse LLM response',
                error: parseError.message,
            });
        }

        // Store test utterances in session if session exists
        console.log('[LLM] Storing test utterances, session available:', !!req.session);

        // Check if we have a valid session object
        if (req.session) {
            if (!req.session.testData) {
                req.session.testData = {};
            }
            req.session.testData[language] = testUtterances.utterances;
            console.log(
                `[LLM] Stored ${testUtterances.utterances.length} test utterances in session for language: ${language}`
            );
        } else {
            console.log('[LLM] No valid session found, skipping session storage');
            // If no session exists, we'll just return the data without storing it
        }

        return res.status(200).json({
            success: true,
            data: testUtterances.utterances,
        });
    } catch (error) {
        console.error('Error generating test utterances:', error.response?.data || error.message);

        return res.status(error.response?.status || 500).json({
            success: false,
            message: 'Failed to generate test utterances',
            error: error.response?.data || error.message,
        });
    }
});

/**
 * @route   POST /api/llm/generate-more-tests
 * @desc    Generate more test utterances using LLM with context from existing utterances
 * @access  Private
 */
router.post('/generate-more-tests', async (req, res) => {
    process.stdout.write('\n\n***** LLM GENERATE MORE TESTS ENDPOINT CALLED *****\n');

    try {
        const { intents, language, existingUtterances } = req.body;

        if (!intents || !language) {
            return res.status(400).json({
                success: false,
                message: 'Intents and language are required',
            });
        }

        if (!existingUtterances || !Array.isArray(existingUtterances) || existingUtterances.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Existing utterances are required and must be a non-empty array',
            });
        }

        // Get LLM API key from environment variables
        const llmApiKey = process.env.GROQ_API_KEY || process.env.LLM_API_KEY;

        if (!llmApiKey) {
            return res.status(500).json({
                success: false,
                message: 'LLM API key is not configured',
            });
        }

        // Create a debug log file
        try {
            const debugDir = path.join(__dirname, '..', 'debug-logs');
            if (!fs.existsSync(debugDir)) {
                fs.mkdirSync(debugDir, { recursive: true });
            }

            const debugFile = path.join(debugDir, `llm-more-tests-debug-${Date.now()}.log`);
            fs.writeFileSync(
                debugFile,
                `LLM generate-more-tests endpoint called at ${new Date().toISOString()}\n\nRequest body: ${JSON.stringify(
                    req.body,
                    null,
                    2
                )}\n\n`
            );
            process.stdout.write(`Debug log created at: ${debugFile}\n`);
        } catch (debugErr) {
            process.stdout.write(`Failed to create debug log: ${debugErr.message}\n`);
        }

        // Generate a modified prompt that includes existing utterances
        const moreTestsPrompt = generateMoreTestsPrompt(intents, language, existingUtterances);

        // Call Groq API with Deepseek model
        const llmResponse = await axios.post(
            'https://api.groq.com/openai/v1/chat/completions',
            {
                model: 'llama-3.3-70b-versatile',
                messages: [
                    {
                        role: 'user',
                        content: moreTestsPrompt,
                    },
                ],
                temperature: 0.7,
                max_tokens: 4000,
                response_format: { type: 'json_object' },
            },
            {
                headers: {
                    Authorization: `Bearer ${llmApiKey}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        // Parse LLM response
        let testUtterances;
        try {
            // Extract JSON from LLM response
            const content = llmResponse.data.choices[0].message.content;
            const parsedContent = JSON.parse(content);

            // Validate response format
            if (!parsedContent.utterances || !Array.isArray(parsedContent.utterances)) {
                // Try to handle different response formats
                if (Array.isArray(parsedContent)) {
                    // If the response is a direct array
                    testUtterances = { utterances: parsedContent };
                } else {
                    throw new Error('Invalid response format from LLM');
                }
            } else {
                testUtterances = parsedContent;
            }

            // Additional validation of utterance objects
            testUtterances.utterances.forEach((utterance) => {
                if (!utterance.text && !utterance.utterance) {
                    console.warn('Missing text in utterance object:', utterance);
                    utterance.text = 'Missing text';
                } else if (utterance.utterance && !utterance.text) {
                    // Convert utterance to text if needed
                    utterance.text = utterance.utterance;
                }

                if (!utterance.expected_intent) {
                    console.warn('Missing intent in utterance object:', utterance);
                    utterance.expected_intent = utterance.intent || 'unknown';
                }

                // Ensure expected_slots exists
                utterance.expected_slots = utterance.expected_slots || utterance.slots || {};
            });
        } catch (parseError) {
            console.error('Error parsing LLM response:', parseError);
            console.error('Raw content:', llmResponse.data.choices[0].message.content);
            return res.status(500).json({
                success: false,
                message: 'Failed to parse LLM response',
                error: parseError.message,
            });
        }

        return res.status(200).json({
            success: true,
            data: testUtterances.utterances,
        });
    } catch (error) {
        console.error('Error generating more test utterances:', error.response?.data || error.message);

        return res.status(error.response?.status || 500).json({
            success: false,
            message: 'Failed to generate more test utterances',
            error: error.response?.data || error.message,
        });
    }
});

/**
 * @route   POST /api/llm/generate-description
 * @desc    Generate a bot description based on its intents
 * @access  Private
 */
router.post('/generate-description', async (req, res) => {
    process.stdout.write('\n\n***** LLM GENERATE DESCRIPTION ENDPOINT CALLED *****\n');

    try {
        const { intents } = req.body;

        if (!intents || !Array.isArray(intents)) {
            return res.status(400).json({
                success: false,
                message: 'Intents array is required',
            });
        }

        // Get LLM API key from environment variables
        const llmApiKey = process.env.GROQ_API_KEY || process.env.LLM_API_KEY;

        if (!llmApiKey) {
            return res.status(500).json({
                success: false,
                message: 'LLM API key is not configured',
            });
        }

        // Generate a prompt for the bot description
        const { entities } = req.body;

        // Generate a prompt that includes both intents and entities
        const prompt = `You are an expert in conversational AI and chatbot analysis. Based on the following list of intents and entities, generate a concise but informative description of what this bot can do. The description should be around 2-3 sentences and focus on the bot's main capabilities.

Intents:
${intents
    .map((intent) => {
        const entityRefs =
            intent.entityReferences && intent.entityReferences.length
                ? ` (Uses entities: ${intent.entityReferences.join(', ')})`
                : '';
        return `- ${intent.name}${intent.description ? `: ${intent.description}` : ''}${entityRefs}`;
    })
    .join('\n')}

${
    entities && entities.length > 0
        ? `\nEntities:
${entities.map((entity) => `- ${entity.name} (${entity.type})`).join('\n')}`
        : ''
}

Write a natural description that explains the bot's purpose, main functionalities, and data collection capabilities to a business user.`;

        // Call Groq API with Deepseek model
        const llmResponse = await axios.post(
            'https://api.groq.com/openai/v1/chat/completions',
            {
                model: 'llama-3.3-70b-versatile',
                messages: [
                    {
                        role: 'user',
                        content: prompt,
                    },
                ],
                temperature: 0.7,
                max_tokens: 500,
            },
            {
                headers: {
                    Authorization: `Bearer ${llmApiKey}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        // Extract the description from the response and clean it up
        let description = llmResponse.data.choices[0].message.content.trim();

        // Remove <think> tags and their content
        description = description.replace(/<think>.*?<\/think>/gs, '').trim();

        return res.status(200).json({
            success: true,
            description,
        });
    } catch (error) {
        console.error('Error generating bot description:', error.response?.data || error.message);

        return res.status(error.response?.status || 500).json({
            success: false,
            message: 'Failed to generate bot description',
            error: error.response?.data || error.message,
        });
    }
});

/**
 * Generate prompt for LLM based on intents and language
 * @param {Array} intents - Array of intent objects
 * @param {String} language - Language code (e.g., 'en-US')
 * @returns {String} - Prompt for LLM
 */
function generatePrompt(intents, language) {
    // Map language codes to more descriptive names
    const languageMap = {
        'en-US': 'English (US)',
        'en-GB': 'English (UK)',
        'es-ES': 'Spanish (Spain)',
        'es-MX': 'Spanish (Mexico)',
        'fr-FR': 'French',
        'de-DE': 'German',
        'it-IT': 'Italian',
        'pt-BR': 'Portuguese (Brazil)',
        'nl-NL': 'Dutch',
        'ja-JP': 'Japanese',
    };

    const languageName = languageMap[language] || language;

    // Create a detailed prompt for the LLM based on the provided example
    let prompt = `You are a conversational AI testing assistant. I will provide you with a list of intents, some of which include slots. Your task is to generate 10 realistic user utterances per intent in this specific language whose code is ${languageName}. The output should be a flat list, where each utterance is labeled with its expected intent and, if applicable, the expected slot(s) and their values.

Some utterances should include slot values naturally, while others should not. Not every utterance is required to mention a slot, even if one is defined. Slot values should be incorporated in a conversational way, like a real customer would speak.

✳️ Mix of Realism and Errors:
- The utterances should be a **balanced mix** of:
  - **Correctly written utterances** (natural, grammatically fine)
  - **Slightly imperfect ones** (informal tone, mild typos, grammar mistakes, or missing punctuation)
- Do not make all utterances sloppy or typo-heavy; around **40–50%** can have informal issues or typos.

🧾 Output Format:
Return a **JSON array of objects** under the key "utterances", no explanations, no markdown:
Each object must have:
- "text": the user input string
- "expected_intent": the name of the intent
- "expected_slots": an object showing slot-value pairs (or an empty object if no slots apply)

Example structure:
{
  "utterances": [
    {
      "text": "i wanna open a checking accnt",
      "expected_intent": "account_opening",
      "expected_slots": {
        "account_type": "checking"
      }
    },
    ...
  ]
}

---

### Intents and Slots:

`;

    // Add intent and slot information to the prompt
    intents.forEach((intent, index) => {
        prompt += `${index + 1}. ${intent.name}\n`;

        if (intent.slots && Object.keys(intent.slots).length > 0) {
            Object.entries(intent.slots).forEach(([slotName, slotValues]) => {
                prompt += `   - Slot: ${slotName}\n`;
                prompt += `     - Type: ${Array.isArray(slotValues) ? 'list' : 'string'}\n`;
                if (Array.isArray(slotValues) && slotValues.length > 0) {
                    prompt += `     - Values: [${slotValues.map((v) => `"${v}"`).join(', ')}]\n`;
                }
            });
        } else {
            prompt += `   - No slots\n`;
        }

        prompt += '\n';
    });

    prompt += `Now generate 10 varied utterances per intent, as described above, mixing formal and informal phrasing.`;

    return prompt;
}

/**
 * Generate prompt for requesting more test utterances
 * @param {Array} intents - Array of intent objects
 * @param {String} language - Language code (e.g., 'en-US')
 * @param {Array} existingUtterances - Array of existing utterances to avoid duplicating
 * @returns {String} - Prompt for LLM
 */
function generateMoreTestsPrompt(intents, language, existingUtterances) {
    // Map language codes to more descriptive names
    const languageMap = {
        'en-US': 'English (US)',
        'en-GB': 'English (UK)',
        'es-ES': 'Spanish (Spain)',
        'es-MX': 'Spanish (Mexico)',
        'fr-FR': 'French',
        'de-DE': 'German',
        'it-IT': 'Italian',
        'pt-BR': 'Portuguese (Brazil)',
        'nl-NL': 'Dutch',
        'ja-JP': 'Japanese',
    };

    const languageName = languageMap[language] || language;

    // Format existing utterances for display in the prompt
    const existingUtterancesText = existingUtterances
        .map((u) => {
            const slots = u.expected_slots ? JSON.stringify(u.expected_slots) : '{}';
            return `- "${u.text || u.utterance}" (Intent: ${u.expected_intent || u.intent}, Slots: ${slots})`;
        })
        .join('\n');

    // Create a detailed prompt for the LLM
    let prompt = `You are a conversational AI testing assistant. I will provide you with a list of intents, some of which include slots. Your task is to generate 10 MORE realistic user utterances per intent in ${languageName}. 

IMPORTANT: DO NOT DUPLICATE any of the existing utterances listed below.

The output should be a JSON object with an "utterances" array, where each utterance is labeled with its expected intent and, if applicable, the expected slot(s) and their values.

Some utterances should include slot values naturally, while others should not. Not every utterance is required to mention a slot, even if one is defined. Slot values should be incorporated in a conversational way, like a real customer would speak.

✳️ Mix of Realism and Errors:
- The utterances should be a **balanced mix** of:
  - **Correctly written utterances** (natural, grammatically fine)
  - **Slightly imperfect ones** (informal tone, mild typos, grammar mistakes, or missing punctuation)
- Do not make all utterances sloppy or typo-heavy; around **40–50%** can have informal issues or typos.

🧾 Output Format:
Return a JSON object with an "utterances" array containing objects with these properties:
- "text": the user input string
- "expected_intent": the name of the intent
- "expected_slots": an object showing slot-value pairs (or an empty object if no slots apply)

Example structure:
{
  "utterances": [
    {
      "text": "i wanna open a checking accnt",
      "expected_intent": "account_opening",
      "expected_slots": {
        "account_type": "checking"
      }
    },
    ...
  ]
}

---

### Intents and Slots:

`;

    // Add intent and slot information to the prompt
    intents.forEach((intent, index) => {
        prompt += `${index + 1}. ${intent.name}\n`;

        if (intent.slots && Object.keys(intent.slots).length > 0) {
            Object.entries(intent.slots).forEach(([slotName, slotValues]) => {
                prompt += `   - Slot: ${slotName}\n`;
                prompt += `     - Type: ${Array.isArray(slotValues) ? 'list' : 'string'}\n`;
                if (Array.isArray(slotValues) && slotValues.length > 0) {
                    prompt += `     - Values: [${slotValues.map((v) => `"${v}"`).join(', ')}]\n`;
                }
            });
        } else {
            prompt += `   - No slots\n`;
        }

        prompt += '\n';
    });

    // Add the existing utterances to avoid duplication
    prompt += `\n### EXISTING UTTERANCES (DO NOT DUPLICATE THESE):\n\n${existingUtterancesText}\n\n`;

    prompt += `Now generate 10 MORE varied utterances per intent that are DIFFERENT from the existing ones listed above. Return the result as a valid JSON object with the "utterances" array.`;

    return prompt;
}

module.exports = router;
