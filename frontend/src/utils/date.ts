// Date utility functions for the rental management system

/**
 * Safely converts a date string or Date object to ISO date string (YYYY-MM-DD)
 * Returns today's date if the input is invalid
 */
export const safeToISODate = (dateInput: string | Date | null | undefined): string => {
  if (!dateInput) {
    return new Date().toISOString().slice(0, 10);
  }
  
  const dateObj = new Date(dateInput);
  
  // Check if the date is valid
  if (isNaN(dateObj.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }
  
  return dateObj.toISOString().slice(0, 10);
};

/**
 * Safely converts a date string or Date object to ISO datetime string
 * Returns current datetime if the input is invalid
 */
export const safeToISODateTime = (dateInput: string | Date | null | undefined): string => {
  if (!dateInput) {
    return new Date().toISOString();
  }
  
  const dateObj = new Date(dateInput);
  
  // Check if the date is valid
  if (isNaN(dateObj.getTime())) {
    return new Date().toISOString();
  }
  
  return dateObj.toISOString();
};

/**
 * Formats a date for display in the UI
 * Returns a formatted string or fallback text if invalid
 */
export const formatDateForDisplay = (dateInput: string | Date | null | undefined, fallback: string = 'N/A'): string => {
  if (!dateInput) {
    return fallback;
  }
  
  const dateObj = new Date(dateInput);
  
  // Check if the date is valid
  if (isNaN(dateObj.getTime())) {
    return fallback;
  }
  
  return dateObj.toLocaleDateString();
};

/**
 * Checks if a date string is valid
 */
export const isValidDate = (dateInput: string | Date | null | undefined): boolean => {
  if (!dateInput) {
    return false;
  }
  
  const dateObj = new Date(dateInput);
  return !isNaN(dateObj.getTime());
};

/**
 * Gets the current date in YYYY-MM-DD format
 */
export const getCurrentDateString = (): string => {
  return new Date().toISOString().slice(0, 10);
};

/**
 * Gets the current datetime in ISO format
 */
export const getCurrentDateTimeString = (): string => {
  return new Date().toISOString();
};
