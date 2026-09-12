import apiClient from './client';

/**
 * Get financial summary for a startup.
 * GET /api/finance/:startupId/summary
 */
export const getFinanceSummary = async (startupId) => {
  return await apiClient(`/finance/${startupId}/summary`);
};

/**
 * Get transactions list for a startup.
 * GET /api/finance/:startupId/transactions
 */
export const getTransactions = async (startupId, params = {}) => {
  const query = new URLSearchParams(params).toString();
  const endpoint = `/finance/${startupId}/transactions${query ? `?${query}` : ''}`;
  return await apiClient(endpoint);
};

/**
 * Create a new income/expense transaction.
 * POST /api/finance/:startupId/transactions
 */
export const createTransaction = async (startupId, transactionData) => {
  return await apiClient(`/finance/${startupId}/transactions`, {
    method: 'POST',
    body: JSON.stringify(transactionData),
  });
};

/**
 * Delete a transaction.
 * DELETE /api/finance/transactions/:transactionId
 */
export const deleteTransaction = async (transactionId) => {
  return await apiClient(`/finance/transactions/${transactionId}`, {
    method: 'DELETE',
  });
};

/**
 * Update startup funding details.
 * PUT /api/finance/:startupId/funding
 */
export const updateFundingDetails = async (startupId, fundingData) => {
  return await apiClient(`/finance/${startupId}/funding`, {
    method: 'PUT',
    body: JSON.stringify(fundingData),
  });
};
