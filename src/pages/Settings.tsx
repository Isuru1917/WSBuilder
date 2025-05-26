import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout/Layout';
import { filterKeywordService } from '../lib/supabase';

const Settings: React.FC = () => {
  const [keywords, setKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Load keywords from Supabase on component mount
  useEffect(() => {
    const loadKeywords = async () => {
      try {
        setIsLoading(true);
        const keywordsFromDb = await filterKeywordService.getKeywords();
        setKeywords(keywordsFromDb);
        
        // Also store in localStorage as a fallback/cache
        localStorage.setItem('filterKeywords', JSON.stringify(keywordsFromDb));
      } catch (error) {
        console.error('Error loading keywords:', error);
        setErrorMessage('Failed to load filter keywords from server');
        
        // Try to load from localStorage as fallback
        const savedKeywords = localStorage.getItem('filterKeywords');
        if (savedKeywords) {
          setKeywords(JSON.parse(savedKeywords));
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    loadKeywords();
  }, []);
  const handleAddKeyword = async () => {
    if (newKeyword.trim() === '') return;
    
    // Add keyword if it doesn't already exist
    if (!keywords.includes(newKeyword.trim())) {
      const trimmedKeyword = newKeyword.trim();
      
      try {
        // Our updated service will always succeed since it uses localStorage as fallback
        await filterKeywordService.addKeyword(trimmedKeyword);
        
        // Update local UI state
        const newKeywords = [...keywords, trimmedKeyword];
        setKeywords(newKeywords);
        setNewKeyword('');
        setSuccessMessage('Keyword added successfully!');
        
        // This will clear any previous error message
        setErrorMessage('');
      } catch (error) {
        console.error('Error adding keyword:', error);
        // This shouldn't happen with our improved error handling, but just in case
        setErrorMessage('There was a problem, but the keyword was saved locally');
        
        // Still update the UI to show the keyword was added (from localStorage)
        const storedKeywords = localStorage.getItem('filterKeywords');
        if (storedKeywords) {
          try {
            setKeywords(JSON.parse(storedKeywords));
            setNewKeyword('');
          } catch (e) {
            console.error('Error parsing localStorage keywords:', e);
          }
        }
      } finally {
        setTimeout(() => {
          setSuccessMessage('');
          setErrorMessage('');
        }, 3000);
      }
    } else {
      // Keyword already exists
      setErrorMessage('Keyword already exists in the filter list');
      setTimeout(() => {
        setErrorMessage('');
      }, 3000);
    }
  };
  const handleRemoveKeyword = async (indexToRemove: number) => {
    const keywordToRemove = keywords[indexToRemove];
    
    try {
      // Our updated service will always succeed since it uses localStorage as fallback
      await filterKeywordService.removeKeyword(keywordToRemove);
      
      // Update local UI state
      const newKeywords = keywords.filter((_, index) => index !== indexToRemove);
      setKeywords(newKeywords);
      setSuccessMessage('Keyword removed successfully!');
      
      // This will clear any previous error message
      setErrorMessage('');
    } catch (error) {
      console.error('Error removing keyword:', error);
      // This shouldn't happen with our improved error handling, but just in case
      setErrorMessage('There was a problem, but the keyword was removed locally');
      
      // Still update the UI to show the keyword was removed (from localStorage)
      const storedKeywords = localStorage.getItem('filterKeywords');
      if (storedKeywords) {
        try {
          setKeywords(JSON.parse(storedKeywords));
        } catch (e) {
          console.error('Error parsing localStorage keywords:', e);
        }
      }
    } finally {
      setTimeout(() => {
        setSuccessMessage('');
        setErrorMessage('');
      }, 3000);
    }
  };
  return (
    <Layout>
      <div className="p-8 max-w-4xl mx-auto">
        <h1 className="text-2xl font-semibold mb-6">Settings</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-medium mb-4">Filter Keywords</h2>
          <p className="text-gray-600 mb-4">
            Add keywords below. Records containing these keywords in the Material column will be filtered out from the table.
            Keywords are synchronized across all users.
          </p>
          
          <div className="flex mb-4">
            <input
              type="text"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              className="flex-1 p-2 border border-gray-300 rounded-l focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Enter keyword to filter"
              disabled={isLoading}
            />
            <button
              onClick={handleAddKeyword}
              className={`bg-purple-600 text-white px-4 py-2 rounded-r hover:bg-purple-700 transition ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={isLoading}
            >
              {isLoading ? 'Loading...' : 'Add Keyword'}
            </button>
          </div>
          
          {successMessage && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
              {successMessage}
            </div>
          )}
          
          {errorMessage && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {errorMessage}
            </div>
          )}
          
          <div className="mt-6">
            <h3 className="font-medium mb-2">Current Filter Keywords</h3>
            {isLoading ? (
              <div className="flex items-center text-gray-500">
                <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <circle 
                    className="opacity-25" 
                    cx="12" 
                    cy="12" 
                    r="10" 
                    stroke="currentColor" 
                    strokeWidth="4"
                  ></circle>
                  <path 
                    className="opacity-75" 
                    fill="currentColor" 
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Loading keywords...
              </div>
            ) : keywords.length === 0 ? (
              <p className="text-gray-500 italic">No keywords added yet</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {keywords.map((keyword, index) => (
                  <div 
                    key={index} 
                    className="bg-gray-100 flex items-center px-3 py-1 rounded"
                  >
                    <span>{keyword}</span>
                    <button
                      onClick={() => handleRemoveKeyword(index)}
                      className="ml-2 text-red-500 hover:text-red-700"
                      title="Remove keyword"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Settings;
