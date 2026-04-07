/**
 * Simulated SMS Service Integration
 * In production, this would make an API call to Fast2SMS, Twilio, or MSG91.
 */

export interface SMSPayload {
  to: string; // Phone number e.g., '+919876543210'
  message: string;
}

export const sendTransactionalSMS = async (_payload: SMSPayload): Promise<boolean> => {
  void _payload;
  // Simulate network latency for the API payload
  return new Promise((resolve) => {
    setTimeout(() => {
      // In a real frontend environment, we wouldn't send secrets. We would hit 
      // a Vercel serverless route or other backend that holds the API key.
      // Example: await fetch('/api/send-sms', { method: 'POST', body: JSON.stringify(payload) })
      resolve(true);
    }, 800);
  });
};

/**
 * Standardized Notification Templates
 */
export const SMS_TEMPLATES = {
  orderPlaced: (orderId: string, amount: number) => 
    `Pyramid FM: Your order ${orderId} for Rs.${amount} has been successfully placed and is pending approval.`,
    
  orderApproved: (orderId: string) => 
    `Pyramid FM: Great news! Order ${orderId} has been approved and moved to packing.`,
    
  orderDispatched: (orderId: string, vehicleNo: string = 'MH-04-1234') => 
    `Pyramid FM: Your order ${orderId} has been dispatched. Track delivery. Vehicle: ${vehicleNo}.`,
    
  orderDelivered: (orderId: string) => 
    `Pyramid FM: Order ${orderId} has been delivered successfully. Check your portal for the Tax Invoice.`
};
