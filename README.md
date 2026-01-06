# Personal Website

Minimalistic personal website for Rafayel Hovhannisyan (hosembafer).

## Deployment to GitHub Pages

1. Make sure this repository is named `hosembafer.github.io`
2. Push the code to GitHub:
   ```bash
   git add .
   git commit -m "Add personal website"
   git push origin main
   ```
3. Go to your repository settings on GitHub
4. Navigate to Pages section
5. Under "Source", select the `main` branch
6. Save the settings
7. Your site will be available at: `https://hosembafer.github.io`

## Local Development

To view the website locally, simply open `index.html` in your browser.

## Customization

- Edit `index.html` to update content and styles (CSS is embedded in the `<style>` tag)
- Add images to the `images` folder
- The site features a dark/light theme toggle that respects system preferences

## Features

- Minimalistic, monospace design
- Dark/light theme toggle with system preference detection
- Responsive layout for mobile and desktop
- Profile photo with grayscale filter
- Links to GitHub, LinkedIn, Medium, and Buy Me a Coffee

## SEO Best Practices

The website includes:
- Semantic HTML5 elements
- Meta tags for description and author
- Proper heading hierarchy
- Accessible links with `rel="noopener"` for external links
- Responsive design for mobile devices
- Theme persistence using localStorage
