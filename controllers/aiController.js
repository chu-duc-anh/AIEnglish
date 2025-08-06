
import { GoogleGenAI, Type } from "@google/genai";

const getSystemInstructionForScenario = (scenario, assistantName) => {
    // This helper function is copied from the original geminiService.ts
    // to keep the logic consistent.
    let instruction = `You are an English speaking practice partner named ${assistantName}. Your goal is to help the user practice speaking English. Keep your English responses natural and engaging.`;

    switch (scenario) {
        case 'restaurant':
            instruction = `You are ${assistantName}, a friendly and patient waiter at a restaurant. Your goal is to help the user practice ordering food and drinks in English. Guide them through the menu, take their order, and handle any questions they might have about the dishes. Be polite and professional.`;
            break;
        case 'interview':
            instruction = `You are ${assistantName}, a professional hiring manager conducting a job interview. Your goal is to help the user practice their interview skills in English. Ask them common interview questions (e.g., "Tell me about yourself," "What are your strengths?"). Keep your tone professional and encouraging.`;
            break;
        case 'freestyle':
        default:
            break;
    }
    return instruction;
};


export const getSentenceSuggestions = async (req, res) => {
    try {
        const { textToImprove } = req.body;

        if (!textToImprove) {
            return res.status(400).json({ message: 'Missing required field: textToImprove' });
        }
        if (!process.env.API_KEY) {
            console.error("API_KEY is not set on the server.");
            return res.status(500).json({ suggestions: [] });
        }

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

        const result = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `The user said: "${textToImprove}". Provide 3 alternative, more natural, or more sophisticated ways to say the same thing.`,
            config: {
                systemInstruction: "You are an expert English language coach. Your goal is to help users improve their phrasing.",
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        suggestions: {
                            type: Type.ARRAY,
                            description: "A list of 3 alternative sentences.",
                            items: {
                                type: Type.STRING
                            }
                        }
                    },
                    required: ['suggestions']
                }
            }
        });

        const jsonStr = result.text;
        const parsed = JSON.parse(jsonStr);

        res.status(200).json(parsed.suggestions || []);

    } catch (error) {
        console.error("Error in getSentenceSuggestions:", error);
        // Don't send a full error message, just an empty array so the frontend doesn't break.
        res.status(500).json([]);
    }
};

export const getAiChatResponse = async (req, res) => {
    try {
        const { history, assistantName, scenario } = req.body;

        if (!history || !assistantName || !scenario) {
            return res.status(400).json({ message: 'Missing required fields: history, assistantName, scenario' });
        }

        if (!process.env.API_KEY) {
            console.error("API_KEY is not set on the server.");
            return res.status(500).json({
                response: "AI service is not configured correctly on the server.",
                translation: "Dịch vụ AI chưa được cấu hình đúng trên máy chủ."
            });
        }

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

        const result = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: history,
            config: {
                systemInstruction: getSystemInstructionForScenario(scenario, assistantName),
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        englishResponse: {
                            type: Type.STRING,
                            description: "A friendly, conversational English reply based on the persona."
                        },
                        vietnameseTranslation: {
                            type: Type.STRING,
                            description: "The Vietnamese translation of the English response."
                        }
                    },
                    required: ['englishResponse', 'vietnameseTranslation']
                }
            }
        });

        const jsonStr = result.text.trim();
        const parsed = JSON.parse(jsonStr);

        // Send the parsed JSON response back to the frontend
        res.status(200).json({
            response: parsed.englishResponse,
            translation: parsed.vietnameseTranslation
        });

    } catch (error) {
        console.error("Error in getAiChatResponse:", error);
        // Provide a generic server error message
        res.status(500).json({
            response: "An error occurred while communicating with the AI service.",
            translation: "Đã xảy ra lỗi khi giao tiếp với dịch vụ AI."
        });
    }
};

export const getTopicSuggestion = async (req, res) => {
    try {
        const { scenario, history } = req.body;

        if (!scenario || !history) {
            return res.status(400).json({ message: 'Missing required fields: scenario, history' });
        }
        if (!process.env.API_KEY) {
            return res.status(500).json({
                response: "AI service is not configured correctly on the server.",
                translation: "Dịch vụ AI chưa được cấu hình đúng trên máy chủ."
            });
        }

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

        const prompt = `The user is practicing their English in a conversation with an AI. The scenario is '${scenario}'. The user has asked for a hint on what to say next. Based on the last few messages of the conversation, provide one single, engaging question or topic suggestion to keep the conversation going. The suggestion should be something the user can naturally say to the AI.

        Recent conversation:
        ${history.slice(-4).map(h => `${h.role}: ${h.parts[0].text}`).join('\n')}

        Your suggestion should be just the sentence the user could say.`;

        const result = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                systemInstruction: "You are an AI assistant helping a user who is stuck in an English conversation practice. You provide a single, natural-sounding suggestion for what they could say next. You will provide both the English suggestion and its Vietnamese translation.",
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        englishResponse: {
                            type: Type.STRING,
                            description: "A single, natural-sounding English question or topic suggestion that the user can say."
                        },
                        vietnameseTranslation: {
                            type: Type.STRING,
                            description: "The Vietnamese translation of the English suggestion."
                        }
                    },
                    required: ['englishResponse', 'vietnameseTranslation']
                }
            }
        });

        const jsonStr = result.text.trim();
        const parsed = JSON.parse(jsonStr);

        res.status(200).json({
            response: `How about this: "${parsed.englishResponse}"`,
            translation: `Thử nói thế này xem: "${parsed.vietnameseTranslation}"`
        });

    } catch (error) {
        console.error("Error in getTopicSuggestion:", error);
        res.status(500).json({
            response: "An error occurred while trying to get a suggestion.",
            translation: "Đã xảy ra lỗi khi cố gắng lấy gợi ý."
        });
    }
};


export const generateRandomSentence = async (req, res) => {
    try {
        if (!process.env.API_KEY) {
            console.error("API_KEY is not set on the server.");
            return res.status(500).json({
                sentence: "AI service is not configured correctly on the server.",
                ipa: ""
            });
        }

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

        const result = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: "Generate a single, interesting, and grammatically correct English sentence that is suitable for a language learner to practice reading. The sentence should be between 10 and 15 words long.",
            config: {
                systemInstruction: "You are an English teacher creating practice materials. You will provide a sentence and its International Phonetic Alphabet (IPA) transcription.",
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        sentence: {
                            type: Type.STRING,
                            description: "The generated English sentence."
                        },
                        ipa: {
                            type: Type.STRING,
                            description: "The IPA transcription of the sentence using slashes, e.g., /həˈloʊ/."
                        }
                    },
                    required: ['sentence', 'ipa']
                }
            }
        });

        const jsonStr = result.text.trim();
        const parsed = JSON.parse(jsonStr);
        res.status(200).json(parsed);

    } catch (error) {
        console.error("Error in generateRandomSentence:", error);
        res.status(500).json({
            sentence: "An error occurred while communicating with the AI service.",
            ipa: ""
        });
    }
};
