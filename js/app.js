// Главный класс приложения
class WikiApp {
    constructor() {
        this.contentLoader = new ContentLoader();
        this.currentPage = 'main';
        this.init();
    }
    
    async init() {
        // Загружаем категории
        await this.contentLoader.loadCategories();
        
        // Генерируем навигацию
        this.generateNavigation();
        this.generateSidebar();
        
        // Обрабатываем URL
        this.handleRouting();
        
        // Настраиваем обработчики событий
        this.setupEventListeners();
    }
    
    generateNavigation() {
        const categories = this.contentLoader.categories;
        if (!categories) return;
        
        const navList = document.querySelector('.nav-list');
        
        // Очищаем существующие элементы (кроме главной)
        const existingItems = navList.querySelectorAll('.nav-item:not(:first-child)');
        existingItems.forEach(item => item.remove());
        
        // Добавляем категории
        categories.categories.forEach(category => {
            const navItem = document.createElement('li');
            navItem.className = 'nav-item';
            
            const navLink = document.createElement('a');
            navLink.href = `?category=${category.id}`;
            navLink.className = 'nav-link';
            navLink.textContent = category.name;
            
            navItem.appendChild(navLink);
            navList.appendChild(navItem);
        });
    }
    
    generateSidebar() {
        const categories = this.contentLoader.categories;
        if (!categories) return;
        
        const sidebar = document.querySelector('.wiki-sidebar');
        
        // Создаем секцию категорий
        const categoriesSection = document.createElement('div');
        categoriesSection.className = 'sidebar-section';
        categoriesSection.innerHTML = '<h3>Категории</h3>';
        
        const categoriesList = document.createElement('ul');
        categoriesList.className = 'sidebar-links';
        
        categories.categories.forEach(category => {
            const listItem = document.createElement('li');
            const link = document.createElement('a');
            link.href = `?category=${category.id}`;
            link.textContent = category.name;
            listItem.appendChild(link);
            categoriesList.appendChild(listItem);
        });
        
        categoriesSection.appendChild(categoriesList);
        
        // Заменяем секцию категорий
        const existingCategoriesSection = sidebar.querySelector('.sidebar-section:last-child');
        if (existingCategoriesSection) {
            sidebar.replaceChild(categoriesSection, existingCategoriesSection);
        } else {
            sidebar.appendChild(categoriesSection);
        }
    }
    
    async handleRouting() {
        const urlParams = new URLSearchParams(window.location.search);
        const category = urlParams.get('category');
        const article = urlParams.get('article');
        
        if (category && article) {
            await this.loadArticle(category, article);
        } else if (category) {
            await this.loadCategory(category);
        } else {
            await this.loadMainPage();
        }
    }
    
    async loadMainPage() {
        const content = await this.contentLoader.loadMainContent();
        this.updatePage('Добро пожаловать в Wiki', content, 'Главная');
        this.updateActiveNavigation('');
    }
    
    async loadCategory(categoryId) {
        const categories = this.contentLoader.categories;
        const category = categories.categories.find(cat => cat.id === categoryId);
        
        if (!category) {
            this.show404();
            return;
        }
        
        let content = `<h2>${category.name}</h2>`;
        content += `<p>${category.description}</p>`;
        
        if (category.subcategories.length > 0) {
            content += '<div class="wiki-links">';
            category.subcategories.forEach(sub => {
                content += `
                    <a href="?category=${categoryId}&article=${sub.id}" class="wiki-link-card">
                        <h4>${sub.name}</h4>
                        <p>Подробная информация о ${sub.name.toLowerCase()}</p>
                    </a>
                `;
            });
            content += '</div>';
        } else {
            content += '<p>В этой категории пока нет статей.</p>';
        }
        
        const breadcrumb = this.contentLoader.generateBreadcrumb(categoryId);
        this.updatePage(category.name, content, breadcrumb);
        this.updateActiveNavigation(categoryId);
    }
    
    async loadArticle(categoryId, articleId) {
        const article = this.contentLoader.findArticle(categoryId, articleId);
        
        if (!article) {
            this.show404();
            return;
        }
        
        const content = await this.contentLoader.loadMarkdown(article.file);
        const breadcrumb = this.contentLoader.generateBreadcrumb(categoryId, articleId);
        
        this.updatePage(article.name, content, breadcrumb);
        this.updateActiveNavigation(categoryId);
    }
    
    updatePage(title, content, breadcrumb) {
        // Обновляем заголовок только если это не главная страница с собственным заголовком
        const titleElement = document.querySelector('.wiki-title');
        if (!content.includes('<h1>')) {
            titleElement.textContent = title;
            titleElement.style.display = 'block';
        } else {
            titleElement.style.display = 'none';
        }
        
        // Обновляем хлебные крошки
        document.querySelector('.breadcrumb').innerHTML = breadcrumb;
        
        // Обновляем содержимое
        document.querySelector('.wiki-content').innerHTML = content;
        
        // Обновляем заголовок страницы
        document.title = `${title} - cefmt.cn.eu.org`;
    }
    
    updateActiveNavigation(categoryId) {
        // Убираем активный класс у всех ссылок
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        // Добавляем активный класс к нужной ссылке
        if (!categoryId) {
            document.querySelector('.nav-link[href="/"]').classList.add('active');
        } else {
            const activeLink = document.querySelector(`.nav-link[href="?category=${categoryId}"]`);
            if (activeLink) {
                activeLink.classList.add('active');
            }
        }
    }
    
    show404() {
        const content = `
            <div style="text-align: center; padding: 40px;">
                <h2>Страница не найдена</h2>
                <p>Запрашиваемая страница не существует.</p>
                <a href="/" class="wiki-btn">Вернуться на главную</a>
            </div>
        `;
        this.updatePage('Ошибка 404', content, '<a href="/">Главная</a> → <span>Ошибка 404</span>');
    }
    
    setupEventListeners() {
        // Обработка кликов по ссылкам навигации
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a[href^="?"]');
            if (link) {
                e.preventDefault();
                const url = new URL(link.href, window.location.origin);
                window.history.pushState({}, '', url.pathname + url.search);
                this.handleRouting();
            }
        });
        
        // Обработка кнопки "Назад" браузера
        window.addEventListener('popstate', () => {
            this.handleRouting();
        });
        
        // Обработка внутренних ссылок в контенте
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a[href^="/"]');
            if (link && link.hostname === window.location.hostname) {
                e.preventDefault();
                const path = link.pathname;
                const pathParts = path.split('/').filter(part => part);
                
                if (pathParts.length === 2) {
                    const [category, article] = pathParts;
                    const url = `?category=${category}&article=${article}`;
                    window.history.pushState({}, '', url);
                    this.handleRouting();
                }
            }
        });
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    new WikiApp();
});