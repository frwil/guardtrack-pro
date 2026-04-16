<?php

namespace App\Repository;

use App\Entity\AppSettings;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class AppSettingsRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, AppSettings::class);
    }

    public function getValue(string $key, mixed $default = null): mixed
    {
        $setting = $this->findOneBy(['settingKey' => $key]);
        return $setting ? $setting->getSettingValue() : $default;
    }
}