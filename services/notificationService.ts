

export interface EmailNotification {
  to: string;
  subject: string;
  body: string;
}

export const sendEmailNotification = async (notification: EmailNotification): Promise<boolean> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Log to console to simulate SMTP server
  console.group('%c 📧 [MOCK EMAIL SERVICE] Email Sent', 'color: #4f46e5; font-weight: bold; font-size: 12px;');
  console.log(`%cTo: %c${notification.to}`, 'font-weight:bold', 'color: #334155');
  console.log(`%cSubject: %c${notification.subject}`, 'font-weight:bold', 'color: #334155');
  console.log(`%cBody:`, 'font-weight:bold');
  console.log(notification.body);
  console.groupEnd();

  return true;
};

export const sendMassEmailNotification = async (recipients: string[], courseTitle: string): Promise<number> => {
  console.group('%c 📧 [MOCK EMAIL SERVICE] Mass Email Triggered', 'color: #ea580c; font-weight: bold; font-size: 12px;');
  console.log(`Sending to ${recipients.length} recipients for course: ${courseTitle}`);
  console.groupEnd();
  
  // Simulate sending one by one
  for (const recipient of recipients) {
      await sendEmailNotification({
          to: `${recipient.replace(/\s+/g, '.').toLowerCase()}@stuffactory.com`,
          subject: `Nuevo Curso Asignado: ${courseTitle}`,
          body: `Hola ${recipient}, se te ha asignado el curso "${courseTitle}". Ingresa a la plataforma para completarlo.`
      });
  }
  return recipients.length;
};
