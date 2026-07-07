const axios = require('axios');

/**
 * AI Task Breakdown using Google Gemini API (Free Tier)
 * Takes a task title + description and generates smart sub-tasks
 */

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

/**
 * Generate sub-tasks for a given task using Gemini AI
 * @param {string} taskTitle - The main task title
 * @param {string} taskDescription - Optional task description
 * @param {string} projectName - Project context
 * @returns {Array} Array of sub-task objects with title, description, priority
 */
async function generateSubTasks(taskTitle, taskDescription = '', projectName = '') {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY is not set in .env');
    throw new Error('AI feature is not configured. Please add GEMINI_API_KEY to your .env file.');
  }

  const prompt = `You are a professional project manager AI assistant. Given a task, break it down into exactly 5 actionable sub-tasks that would help complete the main task efficiently.

Main Task: "${taskTitle}"
${taskDescription ? `Description: "${taskDescription}"` : ''}
${projectName ? `Project: "${projectName}"` : ''}

Rules:
1. Generate exactly 5 sub-tasks
2. Each sub-task should be specific, actionable, and clear
3. Order them logically (what should be done first to last)
4. Assign a priority: "high" for critical steps, "medium" for important ones, "low" for nice-to-have
5. Keep titles concise (max 10 words)
6. Keep descriptions brief (1-2 sentences max)

Respond ONLY with a valid JSON array in this exact format, no markdown, no code blocks, no extra text:
[
  {"title": "Sub-task title", "description": "Brief description", "priority": "high"},
  {"title": "Sub-task title", "description": "Brief description", "priority": "medium"},
  {"title": "Sub-task title", "description": "Brief description", "priority": "medium"},
  {"title": "Sub-task title", "description": "Brief description", "priority": "low"},
  {"title": "Sub-task title", "description": "Brief description", "priority": "low"}
]`;

  try {
    const response = await axios.post(
      `${GEMINI_API_URL}?key=${apiKey}`,
      {
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024,
          topP: 0.9
        }
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      }
    );

    // Extract text from Gemini response
    const responseText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText) {
      throw new Error('Empty response from Gemini AI');
    }

    // Clean up the response - remove markdown code blocks if present
    let cleanedText = responseText.trim();
    cleanedText = cleanedText.replace(/```json\s*/gi, '').replace(/```\s*/g, '');
    cleanedText = cleanedText.trim();

    // Parse JSON
    const subTasks = JSON.parse(cleanedText);

    // Validate structure
    if (!Array.isArray(subTasks) || subTasks.length === 0) {
      throw new Error('Invalid AI response format');
    }

    // Sanitize and validate each sub-task
    const validSubTasks = subTasks.slice(0, 5).map((st, index) => ({
      title: (st.title || `Sub-task ${index + 1}`).substring(0, 200),
      description: (st.description || '').substring(0, 500),
      priority: ['high', 'medium', 'low'].includes(st.priority) ? st.priority : 'medium'
    }));

    console.log(`🤖 AI generated ${validSubTasks.length} sub-tasks for: "${taskTitle}"`);
    return validSubTasks;

  } catch (error) {
    if (error.response) {
      console.error('❌ Gemini API Error:', error.response.status, error.response.data);
      
      if (error.response.status === 429) {
        throw new Error('AI rate limit reached. Please try again in a minute.');
      }
      if (error.response.status === 403) {
        throw new Error('Invalid Gemini API key. Please check your GEMINI_API_KEY in .env');
      }
    }
    
    console.error('❌ AI Breakdown Error:', error.message);
    throw new Error(error.message || 'Failed to generate sub-tasks. Please try again.');
  }
}

module.exports = { generateSubTasks };
