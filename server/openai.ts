import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

export interface StudyArticle {
  title: string;
  content: string;
  sections: {
    title: string;
    content: string;
    type: "definition" | "explanation" | "example" | "formula";
  }[];
  difficulty: "beginner" | "intermediate" | "advanced";
  estimatedReadTime: number;
  suggestedQuestions: string[];
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
}

export interface Quiz {
  title: string;
  description: string;
  questions: QuizQuestion[];
  estimatedTime: number;
}

export async function generateStudyArticle(prompt: string, subject: string): Promise<StudyArticle> {
  try {
    const systemPrompt = `You are an expert educational content creator. Generate comprehensive study articles that are clear, engaging, and educational. Focus on the subject: ${subject}. 

Structure your response as a JSON object with the following format:
{
  "title": "Article title",
  "content": "Main introductory content",
  "sections": [
    {
      "title": "Section title",
      "content": "Section content with detailed explanations",
      "type": "definition|explanation|example|formula"
    }
  ],
  "difficulty": "beginner|intermediate|advanced",
  "estimatedReadTime": number_in_minutes,
  "suggestedQuestions": ["Follow-up question 1", "Follow-up question 2"]
}

Make the content educational, accurate, and include real-world applications where relevant.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      max_tokens: 2000,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No content generated");
    }

    return JSON.parse(content) as StudyArticle;
  } catch (error) {
    console.error("Error generating study article:", error);
    throw new Error("Failed to generate study article: " + (error as Error).message);
  }
}

export async function generateQuiz(topic: string, subject: string, numQuestions: number = 5): Promise<Quiz> {
  try {
    const systemPrompt = `You are an expert quiz creator for educational content. Create engaging and challenging quiz questions for the subject: ${subject}.

Generate a quiz with ${numQuestions} questions about: ${topic}

Structure your response as a JSON object with the following format:
{
  "title": "Quiz title",
  "description": "Brief description of what the quiz covers",
  "questions": [
    {
      "question": "Question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Explanation of why this answer is correct",
      "difficulty": "easy|medium|hard"
    }
  ],
  "estimatedTime": number_in_minutes
}

Make questions challenging but fair, with clear explanations for the correct answers.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Create a quiz about: ${topic}` }
      ],
      response_format: { type: "json_object" },
      max_tokens: 1500,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No content generated");
    }

    return JSON.parse(content) as Quiz;
  } catch (error) {
    console.error("Error generating quiz:", error);
    throw new Error("Failed to generate quiz: " + (error as Error).message);
  }
}

export async function generateThreadResponse(question: string, context: string, subject: string): Promise<string> {
  try {
    const systemPrompt = `You are a helpful educational AI assistant specializing in ${subject}. 
    
    Provide clear, concise, and educational responses to student questions. Use the provided context to give relevant answers.
    
    Context: ${context}
    
    Guidelines:
    - Be educational and encouraging
    - Provide examples when helpful
    - Keep responses focused and not too lengthy
    - Use proper formatting for clarity`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question }
      ],
      max_tokens: 500,
    });

    return response.choices[0].message.content || "I'm sorry, I couldn't generate a response.";
  } catch (error) {
    console.error("Error generating thread response:", error);
    throw new Error("Failed to generate response: " + (error as Error).message);
  }
}

export async function getTermDefinition(term: string): Promise<string> {
  try {
    const systemPrompt = `You are an educational dictionary. Provide clear, concise definitions for academic terms.
    
    Format your response as a single paragraph definition that is educational and easy to understand.
    Include the field of study if relevant.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Define: ${term}` }
      ],
      max_tokens: 200,
    });

    return response.choices[0].message.content || `Definition for "${term}" is not available.`;
  } catch (error) {
    console.error("Error getting term definition:", error);
    
    // Fallback to a simple definition
    return `Definition for "${term}" would be fetched from educational resources.`;
  }
}

export async function generateStudyPlan(subject: string, goals: string, timeframe: string): Promise<{
  title: string;
  description: string;
  weeks: {
    week: number;
    title: string;
    topics: string[];
    goals: string[];
  }[];
}> {
  try {
    const systemPrompt = `You are an expert study planner. Create detailed study plans that are practical and achievable.

Structure your response as a JSON object with the following format:
{
  "title": "Study plan title",
  "description": "Brief description of the study plan",
  "weeks": [
    {
      "week": 1,
      "title": "Week title",
      "topics": ["Topic 1", "Topic 2"],
      "goals": ["Goal 1", "Goal 2"]
    }
  ]
}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Create a study plan for ${subject}. Goals: ${goals}. Timeframe: ${timeframe}` }
      ],
      response_format: { type: "json_object" },
      max_tokens: 1000,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No content generated");
    }

    return JSON.parse(content);
  } catch (error) {
    console.error("Error generating study plan:", error);
    throw new Error("Failed to generate study plan: " + (error as Error).message);
  }
}
