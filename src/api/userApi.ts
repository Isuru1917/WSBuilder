// This is a mock API to simulate getting the PC username
// In a real environment, this would need to be implemented on the server side
// as browsers cannot directly access system information due to security restrictions

export const getUsernameFromSystem = async (): Promise<string> => {
  try {
    // In a real implementation, this would call a server endpoint
    // that has access to system information
    
    // For now, let's simulate with either:
    // 1. Use a pre-configured value if available
    // 2. Check if someone previously stored it in localStorage
    // 3. Fallback to a default
    
    // Try to get from localStorage
    const storedUsername = localStorage.getItem('username');
    if (storedUsername) {
      return storedUsername;
    }
    
    // For demo purposes, we can ask the user once and store it
    // This would normally only happen once
    if (!localStorage.getItem('usernameAsked')) {
      const username = prompt('What is your name? (This will be stored locally for greeting purposes)');
      if (username) {
        localStorage.setItem('username', username);
        localStorage.setItem('usernameAsked', 'true');
        return username;
      }
    }
    
    return 'User'; // Default fallback
  } catch (error) {
    console.error('Error getting username:', error);
    return 'User';
  }
};
