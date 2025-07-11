// Улучшенный Markdown парсер
class MarkdownParser {
    constructor() {
        this.rules = [
            // Заголовки (в правильном порядке - от большего к меньшему)
            { pattern: /^#### (.*$)/gim, replacement: '<h4>$1</h4>' },
            { pattern: /^### (.*$)/gim, replacement: '<h3>$1</h3>' },
            { pattern: /^## (.*$)/gim, replacement: '<h2>$1</h2>' },
            { pattern: /^# (.*$)/gim, replacement: '<h1>$1</h1>' },
            
            // Жирный и курсивный текст
            { pattern: /\*\*(.*?)\*\*/g, replacement: '<strong>$1</strong>' },
            { pattern: /\*(.*?)\*/g, replacement: '<em>$1</em>' },
            
            // Ссылки
            { pattern: /\[([^\]]+)\]\(([^)]+)\)/g, replacement: '<a href="$2">$1</a>' },
            
            // Код блоки
            { pattern: /```(\w+)?\n([\s\S]*?)```/g, replacement: '<pre><code class="language-$1">$2</code></pre>' },
            { pattern: /`([^`]+)`/g, replacement: '<code>$1</code>' },
        ];
    }

    parse(markdown) {
        let html = markdown;
        
        // Применяем правила для заголовков, жирного текста, ссылок и кода
        this.rules.forEach(rule => {
            html = html.replace(rule.pattern, rule.replacement);
        });
        
        // Обрабатываем списки
        html = this.processLists(html);
        
        // Обрабатываем параграфы (только для строк, которые не являются заголовками или списками)
        html = this.processParagraphs(html);
        
        return html;
    }
    
    processLists(html) {
        // Разбиваем на строки для обработки
        const lines = html.split('\n');
        const result = [];
        let inUnorderedList = false;
        let inOrderedList = false;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmedLine = line.trim();
            
            // Неупорядоченный список
            if (trimmedLine.match(/^- (.+)/)) {
                if (!inUnorderedList) {
                    result.push('<ul>');
                    inUnorderedList = true;
                }
                if (inOrderedList) {
                    result.push('</ol>');
                    inOrderedList = false;
                }
                result.push(`<li>${trimmedLine.substring(2)}</li>`);
            }
            // Упорядоченный список
            else if (trimmedLine.match(/^\d+\. (.+)/)) {
                if (!inOrderedList) {
                    result.push('<ol>');
                    inOrderedList = true;
                }
                if (inUnorderedList) {
                    result.push('</ul>');
                    inUnorderedList = false;
                }
                const match = trimmedLine.match(/^\d+\. (.+)/);
                result.push(`<li>${match[1]}</li>`);
            }
            // Обычная строка
            else {
                if (inUnorderedList) {
                    result.push('</ul>');
                    inUnorderedList = false;
                }
                if (inOrderedList) {
                    result.push('</ol>');
                    inOrderedList = false;
                }
                result.push(line);
            }
        }
        
        // Закрываем открытые списки
        if (inUnorderedList) result.push('</ul>');
        if (inOrderedList) result.push('</ol>');
        
        return result.join('\n');
    }
    
    processParagraphs(html) {
        const lines = html.split('\n');
        const result = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Пропускаем пустые строки
            if (line === '') {
                result.push('');
                continue;
            }
            
            // Пропускаем строки, которые уже являются HTML элементами
            if (line.match(/^<(h[1-6]|ul|ol|li|pre|code)/i)) {
                result.push(lines[i]);
                continue;
            }
            
            // Обрабатываем как параграф только обычный текст
            if (!line.match(/^</) && line.length > 0) {
                result.push(`<p>${line}</p>`);
            } else {
                result.push(lines[i]);
            }
        }
        
        return result.join('\n');
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