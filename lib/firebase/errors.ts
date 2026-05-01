export function getFriendlyAuthError(error: unknown): string {
  // Check if it's a Firebase error with a code
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code: string }).code;
    
    switch (code) {
      case 'auth/email-already-in-use':
        return "Looks like this email is already registered 👀 Try logging in instead.";
      case 'auth/invalid-email':
        return "Hmm, that email doesn't look quite right. Can you double-check it?";
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return "We couldn't find an account with those details. Please check your email and password.";
      case 'auth/weak-password':
        return "Your password is a bit too simple! Try adding some numbers or symbols to make it stronger.";
      case 'auth/too-many-requests':
        return "Whoa there! Too many attempts. Please take a quick break and try again in a few minutes.";
      case 'auth/network-request-failed':
        return "Looks like you're offline. Please check your internet connection and try again.";
      case 'auth/popup-closed-by-user':
        return "Sign-in was cancelled. You can try again whenever you're ready!";
      case 'auth/account-exists-with-different-credential':
        return "An account already exists with the same email but a different sign-in method.";
      case 'auth/requires-recent-login':
        return "For your security, please log out and log back in to do this.";
      default:
        return "Something went wrong on our end. Please try again in a moment.";
    }
  }

  // If it's a standard Error without a Firebase code (e.g. custom thrown errors)
  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred. Please try again.";
}
