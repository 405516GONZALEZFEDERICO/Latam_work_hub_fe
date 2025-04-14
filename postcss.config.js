module.exports = {
  plugins: [
    require('autoprefixer'),
    require('postcss-discard-comments'),
    // Custom plugin to suppress warnings for unsupported CSS selectors
    {
      postcssPlugin: 'postcss-suppress-warnings',
      Once(root, { result }) {
        // This hooks into the PostCSS process and prevents warnings from being output
        result.messages = result.messages.filter(msg => msg.type !== 'warning' || !msg.text.includes('Did not expect successive traversals'));
      }
    }
  ]
}; 