

import Constants from 'expo-constants';

interface IssueDetectionResult {
  success: boolean;
  predicted_class?: string;
  confidence?: number;
  is_issue?: boolean;
  probabilities?: {
    issue: number;
    no_issue: number;
  };
  error?: string;
  timestamp?: string;
}

interface CategoryClassificationResult {
  predicted_class: string;
  confidence: number;
  top_3_predictions: Array<{class: string; confidence: number}>;
  all_probabilities: Record<string, number>;
}

interface CompleteAnalysisResult {
  success: boolean;
  predictions?: {
    issue_detection: IssueDetectionResult;
    category_classification?: CategoryClassificationResult;
  };
  error?: string;
  timestamp?: string;
}

interface ServerStatus {
  api_status: string;
  model: {
    issue_detection: {
      loaded: boolean;
      classes: string[];
    };
  };
  endpoints: string[];
  timestamp: string;
}

class AIAnalysisService {
  private baseUrl: string;
  private timeout: number = 30000; // 30 seconds timeout

  constructor() {
    // Get Flask server URL from environment or use default
    const envUrl = process.env.EXPO_PUBLIC_FLASK_SERVER_URL!;
    this.baseUrl = envUrl || 'https://samadhan-ml-task-server.onrender.com';
    
    // For development, you might want to use your local machine's IP
    if (__DEV__) {
      console.log('🔧 Flask server URL:', this.baseUrl);
      if (this.baseUrl.includes('localhost') || this.baseUrl.includes('devtunnels')) {
        console.log('🔧 Development mode detected');
      }
    }
  }

  /**
   * Check if the Flask server is running and model is loaded
   */
  async checkServerStatus(): Promise<ServerStatus | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout for status
      console.log("FETCHING STATUS AT :- ")
      const response = await fetch(`${this.baseUrl}/status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }

      const result = await response.json();
      return result as ServerStatus;
    } catch (error) {
      console.error('❌ Failed to check server status:', error);
      return null;
    }
  }

  /**
   * Convert image URI to base64
   */
  private async imageUriToBase64(imageUri: string): Promise<string> {
    try {
      const response = await fetch(imageUri);
      const blob = await response.blob();
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Data = (reader.result as string).split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      throw new Error(`Failed to convert image to base64: ${error}`);
    }
  }

  /**
   * Analyze image for issue detection only
   */
  async analyzeIssueDetection(imageUri: string): Promise<IssueDetectionResult> {
    try {
      const base64Data = await this.imageUriToBase64(imageUri);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseUrl}/predict/issue-base64`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: base64Data,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || `Server error: ${response.status}`);
      }

      // Transform Flask server response to our expected format
      const transformedResult: IssueDetectionResult = {
        success: result.success || false,
        predicted_class: result.predicted_class,
        confidence: result.confidence,
        is_issue: result.is_issue,
        probabilities: result.probabilities,
        timestamp: result.timestamp
      };

      return transformedResult;
    } catch (error) {
      console.error('❌ Issue detection analysis failed:', error);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return {
            success: false,
            error: 'Request timeout - server took too long to respond'
          };
        }
        return {
          success: false,
          error: error.message
        };
      }
      
      return {
        success: false,
        error: 'Unknown error occurred during analysis'
      };
    }
  }

  /**
   * Get human-readable suggestions based on AI analysis (IssueDetectionResult version)
   */
  generateSuggestions(analysis: IssueDetectionResult): string {
    if (!analysis.success) {
      return "Unable to analyze the image. Please ensure the image clearly shows a civic issue.";
    }

    if (!analysis.is_issue) {
      return "The image doesn't appear to show a civic issue. Please upload an image that clearly shows the problem you want to report.";
    }

    const confidence = analysis.confidence || 0;
    if (confidence < 0.6) {
      return "The image might contain an issue but it's not very clear. Please upload a clearer image or provide detailed description of the problem.";
    }

    return "Issue detected in the image. Please provide detailed information about the specific problem you're reporting including its impact on the community.";
  }

  /**
   * Get human-readable suggestions based on CompleteAnalysisResult
   */
  generateSuggestionsFromComplete(analysis: CompleteAnalysisResult): string {
    if (!analysis.success || !analysis.predictions) {
      return "Unable to analyze the image. Please ensure the image clearly shows a civic issue.";
    }

    const issueDetection = analysis.predictions.issue_detection;
    
    if (!issueDetection.is_issue) {
      return "The image doesn't appear to show a civic issue. Please upload an image that clearly shows the problem you want to report.";
    }

    const confidence = issueDetection.confidence || 0;
    if (confidence < 0.6) {
      return "The image might contain an issue but it's not very clear. Please upload a clearer image or provide detailed description of the problem.";
    }

    return "Issue detected in the image. Please provide detailed information about the specific problem you're reporting including its impact on the community.";
  }

  /**
   * Get confidence level description
   */
  getConfidenceDescription(confidence: number): string {
    if (confidence >= 0.9) return "Very High";
    if (confidence >= 0.75) return "High";
    if (confidence >= 0.6) return "Medium";
    if (confidence >= 0.4) return "Low";
    return "Very Low";
  }

  /**
   * Determine if analysis result is reliable
   */
  isAnalysisReliable(analysis: IssueDetectionResult): boolean {
    if (!analysis.success) return false;
    
    // Issue detection should be confident
    if (!analysis.confidence || analysis.confidence < 0.6) return false;
    
    return true;
  }

  /**
   * Get server configuration for development
   */
  getServerUrl(): string {
    return this.baseUrl;
  }

  /**
   * Set custom server URL (useful for development)
   */
  setServerUrl(url: string): void {
    this.baseUrl = url;
  }

  /**
   * Test connection to Flask server
   */
  async testConnection(): Promise<{ connected: boolean; error?: string; issueModel?: boolean }> {
    try {
      const status = await this.checkServerStatus();
      
      if (!status) {
        return {
          connected: false,
          error: 'Unable to connect to AI server'
        };
      }

      // Handle both possible server response formats
      const issueModelLoaded = status.model?.issue_detection?.loaded || 
                               (status as any).api_status === 'running' ||
                               true; // Assume loaded if status is returned

      return {
        connected: true,
        issueModel: issueModelLoaded
      };
    } catch (error) {
      console.error('Connection test failed:', error);
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown connection error'
      };
    }
  }

  /**
   * Complete analysis including both issue detection and category classification
   */
  async analyzeComplete(imageUri: string): Promise<CompleteAnalysisResult> {
    try {
      const issueResult = await this.analyzeIssueDetection(imageUri);
      
      if (!issueResult.success) {
        return {
          success: false,
          error: issueResult.error
        };
      }

      return {
        success: true,
        predictions: {
          issue_detection: issueResult,
          // Category classification could be added here if available
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Complete analysis failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Analysis failed'
      };
    }
  }

  /**
   * Map AI category to form category (if category classification is added later)
   */
  mapAICategoryToFormCategory(aiCategory: string): string {
    const categoryMap: Record<string, string> = {
      'road_damage': 'Roads',
      'water_issue': 'Water Supply',
      'waste_management': 'Waste Management',
      'infrastructure': 'Infrastructure',
      'lighting': 'Street Lighting',
      'drainage': 'Drainage'
    };
    
    return categoryMap[aiCategory.toLowerCase()] || 'Other';
  }


}

// Export singleton instance
export const aiAnalysisService = new AIAnalysisService();

// Export types for use in components
export type { IssueDetectionResult, ServerStatus, CompleteAnalysisResult, CategoryClassificationResult };

// Export utility functions
export const AIUtils = {
  /**
   * Format confidence percentage
   */
  formatConfidence: (confidence: number): string => {
    return `${Math.round(confidence * 100)}%`;
  },

  /**
   * Get color for confidence level
   */
  getConfidenceColor: (confidence: number): string => {
    if (confidence >= 0.8) return '#16a34a'; // Green
    if (confidence >= 0.6) return '#ca8a04'; // Yellow
    return '#dc2626'; // Red
  },

  /**
   * Check if image should trigger a warning
   */
  shouldWarnUser: (analysis: IssueDetectionResult): boolean => {
    if (!analysis.success || !analysis.is_issue === undefined) return false;
    return !analysis.is_issue && (analysis.confidence || 0) > 0.7;
  },

  /**
   * Generate issue priority suggestion based on analysis
   */
  suggestPriority: (analysis: CompleteAnalysisResult | IssueDetectionResult): 'low' | 'medium' | 'high' | 'urgent' => {
    // Type guard to check if it's a CompleteAnalysisResult
    const isCompleteResult = (result: any): result is CompleteAnalysisResult => {
      return 'predictions' in result;
    };
    
    let confidence = 0;
    let success = false;
    
    if (isCompleteResult(analysis)) {
      // CompleteAnalysisResult
      success = analysis.success && !!analysis.predictions;
      confidence = analysis.predictions?.issue_detection?.confidence || 0;
    } else {
      // IssueDetectionResult
      const issueResult = analysis as IssueDetectionResult;
      success = issueResult.success;
      confidence = issueResult.confidence || 0;
    }
    
    if (!success) return 'medium';
    
    if (confidence >= 0.9) return 'high';
    if (confidence >= 0.7) return 'medium';
    return 'low';
  }
};