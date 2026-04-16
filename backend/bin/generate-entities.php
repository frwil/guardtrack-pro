<?php
// backend/bin/generate-entities.php

require_once dirname(__DIR__).'/vendor/autoload.php';

use Symfony\Component\Filesystem\Filesystem;

$fs = new Filesystem();

$entities = [
    'User' => [
        'fields' => [
            'email' => 'string:180',
            'password' => 'string:255',
            'firstName' => 'string:100:nullable',
            'lastName' => 'string:100:nullable',
            'role' => 'string:20',
            'hourlyRate' => 'decimal:10:2:nullable',
            'pinCode' => 'string:5:nullable',
            'phone' => 'string:20:nullable',
            'isActive' => 'boolean:true',
        ]
    ],
    // Ajouter les autres entités...
];

echo "Utilise plutôt le Maker Bundle interactif :\n";
echo "docker exec -it guardtrack-backend php bin/console make:entity\n";