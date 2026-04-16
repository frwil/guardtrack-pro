.PHONY: help up down restart logs build clean install

help: ## Affiche l'aide
	@echo "Commandes disponibles :"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

up: ## Démarre tous les conteneurs
	docker-compose up -d

down: ## Arrête tous les conteneurs
	docker-compose down

restart: down up ## Redémarre tous les conteneurs

logs: ## Affiche les logs en temps réel
	docker-compose logs -f

build: ## Reconstruit les images
	docker-compose build --no-cache

clean: ## Nettoie les volumes et conteneurs
	docker-compose down -v
	rm -rf backend/vendor backend/var
	rm -rf frontend/node_modules frontend/.next

install-backend: ## Installe les dépendances Symfony
	docker-compose exec backend composer install

install-frontend: ## Installe les dépendances Next.js
	docker-compose exec frontend bun install

install: install-backend install-frontend ## Installe toutes les dépendances

bash-backend: ## Ouvre un shell dans le conteneur backend
	docker-compose exec backend bash

bash-frontend: ## Ouvre un shell dans le conteneur frontend
	docker-compose exec frontend sh

bash-db: ## Ouvre un shell MySQL
	docker-compose exec db mysql -u guardtrack_user -pguardtrack_pass guardtrack

migrate: ## Exécute les migrations Doctrine
	docker-compose exec backend php bin/console doctrine:migrations:migrate --no-interaction

cache-clear: ## Vide le cache Symfony
	docker-compose exec backend php bin/console cache:clear

init: build up install migrate ## Initialisation complète du projet
	@echo "✅ GuardTrack Pro est prêt !"
	@echo "Backend : http://localhost:8000"
	@echo "Frontend : http://localhost:3000"
	@echo "phpMyAdmin : http://localhost:8080 (profil: tools)"
	@echo "MailHog : http://localhost:8025 (profil: tools)"

tools: ## Démarre les outils additionnels (phpMyAdmin, MailHog)
	docker-compose --profile tools up -d phpmyadmin mailhog

tools-down: ## Arrête les outils additionnels
	docker-compose --profile tools down