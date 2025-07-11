// Простой Markdown парсер
class MarkdownParser {
    constructor() {
        this.rules = [
            // Заголовки
            { pattern: /^### (.*$)/gm, replacement: '<h3>$1</h3>' },
            { pattern: /^## (.*$)/gm, replacement: '<h2>$1</h2>' },
            { pattern: /^# (.*$)/gm, replacement: '<h1>$1</h1>' },
            
            // Жирный и курсивный текст
            { pattern: /\*\*(.*?)\*\*/g, replacement: '<strong>$1</strong>' },
            { pattern: /\*(.*?)\*/g, replacement: '<em>$1</em>' },
            
            // Ссылки
            { pattern: /\[([^\]]+)\]\(([^)]+)\)/g, replacement: '<a href="$2">$1</a>' },
            
            // Код
            { pattern: /```(\w+)?\n([\s\S]*?)```/g, replacement: '<pre><code class="language-$1">$2</code></pre>' },
            { pattern: /`([^`]+)`/g, replacement: '<code>$1</code>' },
            
            // Списки
            { pattern: /^\- (.*$)/gm, replacement: '<li>$1</li>' },
            { pattern: /^\d+\. (.*$)/gm, replacement: '<li>$1</li>' },
            
            // Параграфы (должно быть последним)
            { pattern: /^(?!<[h|l|p|d])(.*$)/gm, replacement: '<p>$1</p>' }
        ];
    }

    parse(markdown) {
        let html = markdown;
        
        // Применяем все правила
        this.rules.forEach(rule => {
            html = html.replace(rule.pattern, rule.replacement);
        });
        
        // Обрабатываем списки
        html = this.processLists(html);
        
        // Убираем пустые параграфы
        html = html.replace(/<p><\/p>/g, '');
        html = html.replace(/<p>(<[^>]+>)<\/p>/g, '$1');
        
        return html;
    }
    
    processLists(html) {
        // Обрабатываем неупорядоченные списки
        html = html.replace(/(<li>.*<\/li>)/gs, (match) => {
            return '<ul>' + match + '</ul>';
        });
        
        // Убираем вложенные ul
        html = html.replace(/<\/ul>\s*<ul>/g, '');
        
        return html;
    }
}

// Загрузчик контента
class ContentLoader {
    constructor() {
        this.parser = new MarkdownParser();
        this.categories = null;
    }
    
    async loadCategories() {
        try {
            const response = await fetch('/content/categories.json');
            this.categories = await response.json();
            return this.categories;
        } catch (error) {
            console.error('Ошибка загрузки категорий:', error);
            return null;
        }
    }
    
    async loadMarkdown(filePath) {
        try {
            const response = await fetch(`/content/${filePath}`);
            const markdown = await response.text();
            return this.parser.parse(markdown);
        } catch (error) {
            console.error('Ошибка загрузки файла:', error);
            return '<p>Ошибка загрузки содержимого</p>';
        }
    }
    
    async loadMainContent() {
        return await this.loadMarkdown('main.md');
    }
    
    findArticle(categoryId, articleId) {
        if (!this.categories) return null;
        
        const category = this.categories.categories.find(cat => cat.id === categoryId);
        if (!category) return null;
        
        const article = category.subcategories.find(sub => sub.id === articleId);
        return article;
    }
    
    generateBreadcrumb(categoryId, articleId) {
        const breadcrumbs = ['<a href="/">Главная</a>'];
        
        if (categoryId && this.categories) {
            const category = this.categories.categories.find(cat => cat.id === categoryId);
            if (category) {
                breadcrumbs.push(`<a href="/?category=${categoryId}">${category.name}</a>`);
                
                if (articleId) {
                    const article = category.subcategories.find(sub => sub.id === articleId);
                    if (article) {
                        breadcrumbs.push(`<span>${article.name}</span>`);
                    }
                }
            }
        }
        
        return breadcrumbs.join(' → ');
    }
}

// Экспорт для использования
window.ContentLoader = ContentLoader;