const { OpenAI } = require('openai');
require('dotenv').config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Function to handle AI requests with retry logic
async function generateAIInsights(data, prompt, retries = 3, delay = 500) {
    try {
        // const prompt = `Generate a summary or insights based on the following data: \n\n${JSON.stringify(data)}\n`;
        // const prompt = `Analyze the following data and provide key insights and trends:
        // \n\n${JSON.stringify(data)}\n\nPlease highlight any important patterns, anomalies, or interesting statistics.`;
        // const prompt = `Provide a statistical analysis of the following data, including means, medians, and any other significant descriptive statistics:
        //                 \n\n${JSON.stringify(data)}\n\nSummarize the central tendencies and variability in the data.`;
        //   const prompt = `Generate the total number of records in the following data and state them from the following: \n\n${JSON.stringify(data)}\n\n`;
        //  const prompt = `Do a comparision among the data from the following:healthcare & technology: \n\n${JSON.stringify(data)}\n\n`;

        const response = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',  // Use the GPT-3.5-turbo model
            messages: [
                { role: 'system', content: 'You are an expert data analyst.' },
                { role: 'user', content: `${prompt}\n\nData: ${JSON.stringify(data)}` },
              ],
            });
            console.log('OpenAI response:', response.choices[0].message.content);

        return response.choices[0].message.content.trim();
    } catch (error) {
        if (error.status === 429 && retries > 0) {
            console.log(`Rate limit exceeded. Retrying in ${delay}ms...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
            return generateAIInsights(data, retries - 1, delay * 2);
        } else {
            console.error('Error with OpenAI:', error);
            throw new Error('Error generating insights from OpenAI');
        }
    }
}

module.exports = {
    generateAIInsights
};