const sendEmail = (email, subject = "Bad news Brochacho", emailBody = "You are fired") => {
    console.log(`Email Awesomely sent to ${email}`);
  };
  
  exports.sendEmail = sendEmail;
