const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const hljs = require('highlight.js');
const MarkdownIt = require('markdown-it');

const ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT, 'src');
const ARTICLES_SRC_DIR = path.join(SRC_DIR, 'articles');
const TEMPLATES_DIR = path.join(SRC_DIR, 'templates');
const PARTIALS_DIR = path.join(SRC_DIR, 'partials');
const OUTPUT_ARTICLES_DIR = path.join(ROOT, 'articles');

const SITE = {
    name: 'Rafayel Hovhannisyan',
    role: 'Senior Software Engineer',
    url: 'https://hosembafer.github.io',
    authorUrl: 'https://hosembafer.github.io',
    email: 'rafayel.hovhannisyan.95@gmail.com',
    city: 'Yerevan',
    country: 'Armenia',
    socialImage: 'https://hosembafer.github.io/images/profile-square.png',
    socialImageAlt: 'Portrait of Rafayel Hovhannisyan',
    mediumUrl: 'https://medium.com/@hosembafer',
    githubUrl: 'https://github.com/hosembafer',
    linkedInUrl: 'https://www.linkedin.com/in/rafayel-hovhannisyan-3045a09b/'
};

const md = new MarkdownIt({
    html: false,
    linkify: true,
    typographer: true,
    highlight(code, language) {
        if (language && hljs.getLanguage(language)) {
            return hljs.highlight(code, { language }).value;
        }

        return md.utils.escapeHtml(code);
    }
});

const defaultFenceRenderer = md.renderer.rules.fence || function(tokens, idx, options, env, self) {
    return self.renderToken(tokens, idx, options);
};
const defaultLinkOpenRenderer = md.renderer.rules.link_open || function(tokens, idx, options, env, self) {
    return self.renderToken(tokens, idx, options);
};

function normalizeCodeLanguage(info) {
    return (info || '').trim().split(/\s+/)[0].toLowerCase();
}

function codeBlockLabel(language) {
    const labels = {
        ts: 'TypeScript',
        tsx: 'TSX / React',
        js: 'JavaScript',
        jsx: 'JSX / React',
        mjs: 'JavaScript Module',
        cjs: 'CommonJS',
        json: 'JSON',
        bash: 'Bash',
        sh: 'Shell',
        zsh: 'Zsh',
        html: 'HTML',
        css: 'CSS',
        scss: 'SCSS',
        sql: 'SQL',
        go: 'Go',
        yaml: 'YAML',
        yml: 'YAML'
    };

    if (!language) {
        return '';
    }

    return labels[language] || language.toUpperCase();
}

function renderHighlightedCode(code, language) {
    if (language && hljs.getLanguage(language)) {
        return hljs.highlight(code, { language }).value;
    }

    return md.utils.escapeHtml(code);
}

md.renderer.rules.fence = function(tokens, idx, options, env, self) {
    const token = tokens[idx];
    const info = (token.info || '').trim();
    const language = normalizeCodeLanguage(info);

    if (language === 'mermaid') {
        return `<div class="mermaid-diagram" data-mermaid-source="${encodeURIComponent(token.content.trim())}"></div>`;
    }

    const label = codeBlockLabel(language);
    const highlighted = renderHighlightedCode(token.content, language);
    const languageClass = language ? ` class="language-${language}"` : '';
    const header = label ? `<div class="code-block__label">${label}</div>` : '';

    return `<div class="code-block">${header}<pre><code${languageClass}>${highlighted}</code></pre></div>`;
};

md.renderer.rules.link_open = function(tokens, idx, options, env, self) {
    const token = tokens[idx];
    const hrefIndex = token.attrIndex('href');
    const href = hrefIndex >= 0 ? token.attrs[hrefIndex][1] : '';

    if (/^https?:\/\//i.test(href)) {
        token.attrSet('target', '_blank');
        token.attrSet('rel', 'noopener');
    }

    return defaultLinkOpenRenderer(tokens, idx, options, env, self);
};

function readFile(filePath) {
    return fs.readFileSync(filePath, 'utf8');
}

function writeFile(filePath, content) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content);
}

function renderTemplate(template, data) {
    return template.replace(/{{(\w+)}}/g, (_, key) => data[key] ?? '');
}

function minifyCss(css) {
    return css
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\s+/g, ' ')
        .replace(/\s*([{}:;,>])\s*/g, '$1')
        .replace(/;}/g, '}')
        .trim();
}

function stripHtml(html) {
    return html
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function formatDate(dateInput) {
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC'
    }).format(new Date(dateInput));
}

function estimateReadingTime(text) {
    const words = text.split(/\s+/).filter(Boolean).length;
    return Math.max(4, Math.ceil(words / 220));
}

function escapeAttribute(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function toDate(value, label) {
    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
        throw new Error(`Invalid date for ${label}: ${value}`);
    }

    return parsed;
}

function loadArticles() {
    const filenames = fs.readdirSync(ARTICLES_SRC_DIR).filter((name) => name.endsWith('.md'));

    return filenames.map((filename) => {
        const source = readFile(path.join(ARTICLES_SRC_DIR, filename));
        const parsed = matter(source);
        const data = parsed.data;

        if (!data.title || !data.description || !data.slug || !data.type || !data.summary) {
            throw new Error(`Missing required front matter in ${filename}`);
        }

        const isExternal = Boolean(data.external_url);
        const rendered = parsed.content.trim() ? md.render(parsed.content) : '';
        const plainText = rendered ? stripHtml(rendered) : '';
        const articleUrl = isExternal ? data.external_url : `${SITE.url}/articles/${data.slug}`;
        const publishedAt = data.date ? toDate(data.date, `${filename} date`) : null;
        const updatedAt = data.updated ? toDate(data.updated, `${filename} updated`) : publishedAt;
        const readingTime = data.reading_time || (parsed.content.trim() ? estimateReadingTime(`${data.title} ${parsed.content}`) : null);

        return {
            title: data.title,
            description: data.description,
            slug: data.slug,
            date: publishedAt,
            updated: updatedAt,
            type: data.type,
            summary: data.summary,
            tags: Array.isArray(data.tags) ? data.tags : [],
            html: rendered,
            plainText,
            readingTime,
            url: articleUrl,
            isExternal,
            sourceName: data.source_name || '',
            filename
        };
    }).sort((left, right) => {
        const leftTime = left.date ? left.date.getTime() : 0;
        const rightTime = right.date ? right.date.getTime() : 0;
        return rightTime - leftTime;
    });
}

function articleListMarkup(articles, headingLevel) {
    return [
        '<ul class="article-list">',
        ...articles.map((article) => {
            const tag = headingLevel === 'h2' ? 'h2' : 'h3';
            const meta = [article.type];

            if (article.sourceName) {
                meta.push(article.sourceName);
            }

            if (article.date) {
                meta.push(formatDate(article.date));
            }

            if (article.readingTime) {
                meta.push(`${article.readingTime} min read`);
            }

            const targetAttrs = article.isExternal ? ' target="_blank" rel="noopener"' : '';

            return `
            <li class="article-item">
                <p class="article-meta">${meta.map((item) => `<span>${item}</span>`).join('')}</p>
                <${tag}><a href="${article.isExternal ? article.url : `/articles/${article.slug}`}"${targetAttrs}>${article.title}</a></${tag}>
                <p class="article-summary">${article.summary}</p>
            </li>`;
        }),
        '</ul>'
    ].join('\n');
}

function personStructuredData() {
    return {
        '@context': 'https://schema.org',
        '@type': 'Person',
        name: SITE.name,
        jobTitle: SITE.role,
        description: 'Software engineer with over 15 years of experience building products for startups, scaleups, and large enterprises. Specialized in complex and challenging projects.',
        url: SITE.url,
        image: `${SITE.url}/images/profile.jpg`,
        address: {
            '@type': 'PostalAddress',
            addressLocality: SITE.city,
            addressCountry: SITE.country
        },
        email: SITE.email,
        sameAs: [
            SITE.githubUrl,
            SITE.linkedInUrl,
            SITE.mediumUrl
        ],
        knowsAbout: [
            'Angular',
            'NestJS',
            'React',
            'Go',
            'Software Engineering',
            'Web Development',
            'Open Source'
        ],
        hasOccupation: {
            '@type': 'Occupation',
            name: SITE.role,
            occupationalCategory: '15-1252.00',
            skills: 'Angular, NestJS, React, Go, TypeScript, JavaScript'
        }
    };
}

function pageData({ title, description, canonicalPath, ogType, bodyClass, content, structuredData, extraMeta = '', activeNav = 'home', twitterCard = 'summary' }) {
    const baseTemplate = readFile(path.join(TEMPLATES_DIR, 'base.html'));
    const headerTemplate = readFile(path.join(PARTIALS_DIR, 'header.html'));
    const footerTemplate = readFile(path.join(PARTIALS_DIR, 'footer.html'));
    const stylesTemplate = minifyCss(readFile(path.join(PARTIALS_DIR, 'styles.css')));
    const canonicalUrl = canonicalPath.startsWith('http') ? canonicalPath : `${SITE.url}${canonicalPath}`;

    const header = renderTemplate(headerTemplate, {
        homeLinkClass: activeNav === 'home' ? 'is-active' : '',
        articlesLinkClass: activeNav === 'articles' ? 'is-active' : ''
    });

    const footer = renderTemplate(footerTemplate, {
        year: String(new Date().getUTCFullYear())
    });

    return renderTemplate(baseTemplate, {
        pageTitle: title,
        socialTitle: title,
        metaDescription: description,
        canonicalUrl,
        ogType,
        socialImage: SITE.socialImage,
        socialImageAlt: SITE.socialImageAlt,
        twitterCard,
        bodyClass,
        styles: stylesTemplate,
        header,
        footer,
        content,
        extraMeta: extraMeta ? `    ${extraMeta.split('\n').join('\n    ')}` : '',
        structuredData: JSON.stringify(structuredData, null, 4)
    });
}

function buildHomePage(articles) {
    const template = readFile(path.join(TEMPLATES_DIR, 'home.html'));
    const content = renderTemplate(template, {
        articlesPreview: articleListMarkup(articles, 'h3')
    });

    const structuredData = personStructuredData();
    const html = pageData({
        title: 'Rafayel Hovhannisyan | Architecture Articles and Software Engineering',
        description: 'Architecture-level articles on frontend systems, API design, and operable software engineering by Rafayel Hovhannisyan.',
        canonicalPath: '',
        ogType: 'website',
        bodyClass: 'page-home',
        content,
        structuredData,
        activeNav: 'home'
    });

    writeFile(path.join(ROOT, 'index.html'), html);
}

function buildArticlePages(articles) {
    for (const article of articles.filter((entry) => !entry.isExternal)) {
        const content = `
<article class="article-hero">
    <div class="article-breadcrumbs"><a href="/">Home</a> / ${article.title}</div>
    <p class="article-meta"><span>${article.type}</span><span>${formatDate(article.date)}</span><span>${article.readingTime} min read</span></p>
    <h1>${article.title}</h1>
    <p class="article-hero__dek">${article.description}</p>
    <ul class="article-tags">
        ${article.tags.map((tag) => `<li>${tag}</li>`).join('')}
    </ul>
</article>
<div class="article-content-wrap">
    <article class="article-content prose">
${article.html}
    </article>
</div>`;

        const structuredData = {
            '@context': 'https://schema.org',
            '@graph': [
                personStructuredData(),
                {
                    '@type': 'Article',
                    headline: article.title,
                    description: article.description,
                    datePublished: article.date,
                    dateModified: article.updated,
                    author: {
                        '@type': 'Person',
                        name: SITE.name,
                        url: SITE.authorUrl
                    },
                    image: [SITE.socialImage],
                    mainEntityOfPage: article.url,
                    url: article.url,
                    keywords: article.tags.join(', ')
                },
                {
                    '@type': 'BreadcrumbList',
                    itemListElement: [
                        {
                            '@type': 'ListItem',
                            position: 1,
                            name: 'Home',
                            item: SITE.url
                        },
                        {
                            '@type': 'ListItem',
                            position: 2,
                            name: article.title,
                            item: article.url
                        }
                    ]
                }
            ]
        };

        const html = pageData({
            title: `${article.title} | Rafayel Hovhannisyan`,
            description: article.description,
            canonicalPath: `/articles/${article.slug}`,
            ogType: 'article',
            bodyClass: 'page-article',
            content,
            structuredData,
            activeNav: 'articles',
            twitterCard: 'summary_large_image',
            extraMeta: [
                `<meta property="article:published_time" content="${article.date.toISOString()}">`,
                `<meta property="article:modified_time" content="${article.updated.toISOString()}">`,
                ...article.tags.map((tag) => `<meta property="article:tag" content="${escapeAttribute(tag)}">`)
            ].join('\n')
        });

        writeFile(path.join(OUTPUT_ARTICLES_DIR, article.slug, 'index.html'), html);
    }
}

function buildSitemap(articles) {
    const urls = [
        `${SITE.url}`,
        ...articles.filter((article) => !article.isExternal).map((article) => article.url)
    ];

    const xml = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ...urls.map((url) => `  <url><loc>${url}</loc></url>`),
        '</urlset>'
    ].join('\n');

    writeFile(path.join(ROOT, 'sitemap.xml'), xml);
}

function buildRobots() {
    const robots = [
        'User-agent: *',
        'Allow: /',
        '',
        `Sitemap: ${SITE.url}/sitemap.xml`
    ].join('\n');

    writeFile(path.join(ROOT, 'robots.txt'), robots);
}

function cleanOutput() {
    fs.rmSync(OUTPUT_ARTICLES_DIR, { recursive: true, force: true });
}

function buildSite() {
    const articles = loadArticles();

    cleanOutput();
    buildHomePage(articles);
    
    buildArticlePages(articles);
    buildSitemap(articles);
    buildRobots();

    return {
        articleCount: articles.length
    };
}

if (require.main === module) {
    const result = buildSite();
    process.stdout.write(`Built ${result.articleCount} articles.\n`);
}

module.exports = {
    buildSite
};
