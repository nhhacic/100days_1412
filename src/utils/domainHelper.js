// Helper để debug domain issues
export function getDomainInfo() {
  const hostname = window.location.hostname;
  const href = window.location.href;
  const protocol = window.location.protocol;
  
  console.log('=== DOMAIN DEBUG INFO ===');
  console.log('Hostname:', hostname);
  console.log('Full URL:', href);
  console.log('Protocol:', protocol);
  console.log('Environment:', process.env.NODE_ENV);
  console.log('=========================');
  
  return {
    hostname,
    href,
    protocol,
    isLocalhost: hostname === 'localhost' || hostname === '127.0.0.1',
    isGithubDev: hostname.includes('.github.dev'),
    suggestedDomains: getSuggestedDomains(hostname)
  };
}

function getSuggestedDomains(hostname) {
  const suggestions = ['localhost', '127.0.0.1'];
  
  if (hostname.includes('.github.dev')) {
    suggestions.push(hostname);
    suggestions.push('*.github.dev');
    suggestions.push('*.app.github.dev');
    suggestions.push('github.dev');
  }
  
  return suggestions;
}

export function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    alert(`Copied to clipboard: ${text}`);
  });
}
