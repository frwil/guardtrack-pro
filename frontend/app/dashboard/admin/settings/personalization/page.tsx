// app/dashboard/admin/settings/personalization/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { settingsService, AppSettings } from '../../../../../src/services/api/settings';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSave,
  faSpinner,
  faBuilding,
  faMapMarkerAlt,
  faPhone,
  faEnvelope,
  faGlobe,
  faFileContract,
  faPalette,
  faImage,
  faUpload,
  faTrash,
  faCheckCircle,
  faBell,
  faFileInvoice,
  faFileAlt,
} from '@fortawesome/free-solid-svg-icons';

interface CompanyFormData {
  name: string;
  email: string;
  phone: string;
  logo?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  website?: string;
  siret?: string;
  vatNumber?: string;
  invoiceFooter?: string;
  reportFooter?: string;
  primaryColor?: string;
  secondaryColor?: string;
  darkModeDefault?: boolean;
  notificationEmail?: string;
  emailSignature?: string;
}

export default function PersonalizationSettingsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'identity' | 'documents' | 'appearance' | 'notifications'>('identity');
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [formData, setFormData] = useState<CompanyFormData>({
    name: '',
    email: '',
    phone: '',
    logo: '',
    address: '',
    city: '',
    postalCode: '',
    country: 'France',
    website: '',
    siret: '',
    vatNumber: '',
    invoiceFooter: 'Merci de votre confiance\nPaiement sous 30 jours',
    reportFooter: 'Document généré automatiquement par GuardTrack Pro',
    primaryColor: '#4F46E5',
    secondaryColor: '#10B981',
    darkModeDefault: false,
    notificationEmail: '',
    emailSignature: 'Cordialement,\nL\'équipe GuardTrack Pro',
  });
  const [successMessage, setSuccessMessage] = useState('');

  // Couleurs prédéfinies
  const colorPresets = [
    { name: 'Indigo', primary: '#4F46E5', secondary: '#10B981' },
    { name: 'Bleu', primary: '#2563EB', secondary: '#F59E0B' },
    { name: 'Violet', primary: '#7C3AED', secondary: '#EC4899' },
    { name: 'Rouge', primary: '#DC2626', secondary: '#6B7280' },
    { name: 'Vert', primary: '#059669', secondary: '#3B82F6' },
  ];

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const data = await settingsService.getSettings();
      setSettings(data);
      
      if (data) {
        setFormData({
          name: data.company.name || '',
          email: data.company.email || '',
          phone: data.company.phone || '',
          logo: data.company.logo || '',
          address: (data.company as any).address || '',
          city: (data.company as any).city || '',
          postalCode: (data.company as any).postalCode || '',
          country: (data.company as any).country || 'France',
          website: (data.company as any).website || '',
          siret: (data.company as any).siret || '',
          vatNumber: (data.company as any).vatNumber || '',
          invoiceFooter: (data.company as any).invoiceFooter || 'Merci de votre confiance\nPaiement sous 30 jours',
          reportFooter: (data.company as any).reportFooter || 'Document généré automatiquement par GuardTrack Pro',
          primaryColor: (data.company as any).primaryColor || '#4F46E5',
          secondaryColor: (data.company as any).secondaryColor || '#10B981',
          darkModeDefault: (data.company as any).darkModeDefault || false,
          notificationEmail: (data.company as any).notificationEmail || data.company.email || '',
          emailSignature: (data.company as any).emailSignature || 'Cordialement,\nL\'équipe GuardTrack Pro',
        });
      }
    } catch (error) {
      console.error('Erreur de chargement:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const result = await settingsService.uploadLogo(file);
      if (result?.url) {
        setFormData(prev => ({ ...prev, logo: result.url }));
        setSuccessMessage('Logo uploadé avec succès !');
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (error) {
      console.error('Erreur d\'upload:', error);
      alert('Erreur lors de l\'upload du logo');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveLogo = () => {
    setFormData(prev => ({ ...prev, logo: '' }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSuccessMessage('');
    
    try {
      // Mettre à jour les paramètres
      const updatedSettings: Partial<AppSettings> = {
        company: {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          logo: formData.logo,
          // Champs supplémentaires
          ...(formData.address && { address: formData.address }),
          ...(formData.city && { city: formData.city }),
          ...(formData.postalCode && { postalCode: formData.postalCode }),
          ...(formData.country && { country: formData.country }),
          ...(formData.website && { website: formData.website }),
          ...(formData.siret && { siret: formData.siret }),
          ...(formData.vatNumber && { vatNumber: formData.vatNumber }),
          ...(formData.invoiceFooter && { invoiceFooter: formData.invoiceFooter }),
          ...(formData.reportFooter && { reportFooter: formData.reportFooter }),
          ...(formData.primaryColor && { primaryColor: formData.primaryColor }),
          ...(formData.secondaryColor && { secondaryColor: formData.secondaryColor }),
          ...(formData.darkModeDefault !== undefined && { darkModeDefault: formData.darkModeDefault }),
          ...(formData.notificationEmail && { notificationEmail: formData.notificationEmail }),
          ...(formData.emailSignature && { emailSignature: formData.emailSignature }),
        } as any,
      };

      await settingsService.updateSettings(updatedSettings);
      
      setSuccessMessage('Paramètres enregistrés avec succès !');
      setTimeout(() => setSuccessMessage(''), 3000);
      
      // Recharger les paramètres
      await loadSettings();
    } catch (error) {
      console.error('Erreur de sauvegarde:', error);
      alert('Erreur lors de l\'enregistrement des paramètres');
    } finally {
      setIsSaving(false);
    }
  };

  const applyColorPreset = (primary: string, secondary: string) => {
    setFormData(prev => ({ ...prev, primaryColor: primary, secondaryColor: secondary }));
  };

  const primaryColor = formData.primaryColor || '#4F46E5';
  const secondaryColor = formData.secondaryColor || '#10B981';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <FontAwesomeIcon icon={faSpinner} spin className="text-3xl" style={{ color: primaryColor }} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* En-tête */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <FontAwesomeIcon icon={faPalette} className="mr-3" style={{ color: primaryColor }} />
              Personnalisation de l'application
            </h1>
            <p className="text-gray-600 mt-1">
              Configurez l'apparence et les informations de votre entreprise
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2 text-white rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center"
            style={{ backgroundColor: primaryColor }}
          >
            {isSaving ? (
              <>
                <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
                Enregistrement...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faSave} className="mr-2" />
                Enregistrer
              </>
            )}
          </button>
        </div>
        
        {successMessage && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center text-green-800">
            <FontAwesomeIcon icon={faCheckCircle} className="mr-2" />
            {successMessage}
          </div>
        )}
      </div>

      {/* Onglets */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b">
          <nav className="flex space-x-8 px-6">
            {([
              { id: 'identity', label: 'Identité', icon: faBuilding },
              { id: 'documents', label: 'Documents', icon: faFileInvoice },
              { id: 'appearance', label: 'Apparence', icon: faPalette },
              { id: 'notifications', label: 'Notifications', icon: faBell },
            ] as const).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                  activeTab === tab.id
                    ? 'border-current'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                style={{ 
                  color: activeTab === tab.id ? primaryColor : undefined,
                  borderColor: activeTab === tab.id ? primaryColor : undefined
                }}
              >
                <FontAwesomeIcon icon={tab.icon} className="mr-2" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Onglet Identité */}
          {activeTab === 'identity' && (
            <div className="space-y-6">
              {/* Logo */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <h3 className="font-medium text-gray-900 mb-4">Logo de l'entreprise</h3>
                {formData.logo ? (
                  <div className="space-y-3">
                    <img 
                      src={formData.logo} 
                      alt="Logo" 
                      className="max-h-24 mx-auto bg-gray-100 p-2 rounded"
                    />
                    <div className="flex justify-center space-x-2">
                      <label className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 cursor-pointer">
                        <FontAwesomeIcon icon={faUpload} className="mr-1" />
                        Changer
                        <input
                          type="file"
                          accept="image/png, image/jpeg, image/svg+xml"
                          onChange={handleLogoUpload}
                          className="hidden"
                          disabled={isUploading}
                        />
                      </label>
                      <button
                        onClick={handleRemoveLogo}
                        className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                      >
                        <FontAwesomeIcon icon={faTrash} className="mr-1" />
                        Supprimer
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="block w-full py-8 text-gray-400 hover:text-gray-600 cursor-pointer">
                    <FontAwesomeIcon icon={faImage} className="text-4xl mb-2" />
                    <p>Cliquez pour uploader un logo</p>
                    <p className="text-xs mt-1">PNG, JPG, SVG (max 2MB)</p>
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/svg+xml"
                      onChange={handleLogoUpload}
                      className="hidden"
                      disabled={isUploading}
                    />
                  </label>
                )}
                {isUploading && (
                  <div className="mt-3">
                    <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
                    Upload en cours...
                  </div>
                )}
              </div>

              {/* Informations entreprise */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FontAwesomeIcon icon={faBuilding} className="mr-2" />
                    Nom de l'entreprise *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
                    style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FontAwesomeIcon icon={faFileContract} className="mr-2" />
                    SIRET
                  </label>
                  <input
                    type="text"
                    name="siret"
                    value={formData.siret}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Numéro TVA
                  </label>
                  <input
                    type="text"
                    name="vatNumber"
                    value={formData.vatNumber}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
                  />
                </div>
              </div>

              {/* Adresse */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3 flex items-center">
                  <FontAwesomeIcon icon={faMapMarkerAlt} className="mr-2" />
                  Adresse
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      placeholder="Adresse"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      placeholder="Ville"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      name="postalCode"
                      value={formData.postalCode}
                      onChange={handleChange}
                      placeholder="Code postal"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      name="country"
                      value={formData.country}
                      onChange={handleChange}
                      placeholder="Pays"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Contact */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FontAwesomeIcon icon={faPhone} className="mr-2" />
                    Téléphone *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FontAwesomeIcon icon={faEnvelope} className="mr-2" />
                    Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FontAwesomeIcon icon={faGlobe} className="mr-2" />
                    Site web
                  </label>
                  <input
                    type="text"
                    name="website"
                    value={formData.website}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Onglet Documents */}
          {activeTab === 'documents' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FontAwesomeIcon icon={faFileInvoice} className="mr-2" />
                  Pied de page des factures
                </label>
                <textarea
                  name="invoiceFooter"
                  value={formData.invoiceFooter}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none resize-none"
                  placeholder="Texte affiché en bas des factures..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FontAwesomeIcon icon={faFileAlt} className="mr-2" />
                  Pied de page des rapports
                </label>
                <textarea
                  name="reportFooter"
                  value={formData.reportFooter}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none resize-none"
                  placeholder="Texte affiché en bas des rapports..."
                />
              </div>

              {/* Aperçu */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">Aperçu</h3>
                <div className="bg-white border rounded-lg p-6">
                  <div className="text-center space-y-2">
                    {formData.logo && (
                      <img src={formData.logo} alt="Logo" className="h-12 mx-auto" />
                    )}
                    <p className="font-bold">{formData.name}</p>
                    <p className="text-sm text-gray-600">
                      {formData.address}, {formData.postalCode} {formData.city}
                    </p>
                    <p className="text-sm text-gray-600">
                      {formData.phone} • {formData.email}
                    </p>
                    <div className="border-t pt-4 mt-4 text-sm text-gray-500 whitespace-pre-line">
                      {formData.invoiceFooter}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Onglet Apparence */}
          {activeTab === 'appearance' && (
            <div className="space-y-6">
              {/* Presets de couleurs */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Thèmes prédéfinis</h3>
                <div className="flex space-x-3">
                  {colorPresets.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => applyColorPreset(preset.primary, preset.secondary)}
                      className="px-4 py-2 rounded-lg border-2 transition"
                      style={{
                        borderColor: primaryColor === preset.primary ? preset.primary : 'transparent',
                      }}
                    >
                      <div className="flex space-x-1">
                        <div className="w-6 h-6 rounded" style={{ backgroundColor: preset.primary }} />
                        <div className="w-6 h-6 rounded" style={{ backgroundColor: preset.secondary }} />
                      </div>
                      <span className="text-xs mt-1 block">{preset.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Couleurs personnalisées */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Couleur primaire
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      name="primaryColor"
                      value={primaryColor}
                      onChange={handleChange}
                      className="w-12 h-12 rounded cursor-pointer border border-gray-300"
                    />
                    <input
                      type="text"
                      name="primaryColor"
                      value={primaryColor}
                      onChange={handleChange}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Couleur secondaire
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      name="secondaryColor"
                      value={secondaryColor}
                      onChange={handleChange}
                      className="w-12 h-12 rounded cursor-pointer border border-gray-300"
                    />
                    <input
                      type="text"
                      name="secondaryColor"
                      value={secondaryColor}
                      onChange={handleChange}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Aperçu */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">Aperçu des couleurs</h3>
                <div className="space-y-3">
                  <div>
                    <button
                      className="px-4 py-2 text-white rounded-lg"
                      style={{ backgroundColor: primaryColor }}
                    >
                      Bouton primaire
                    </button>
                    <button
                      className="ml-3 px-4 py-2 text-white rounded-lg"
                      style={{ backgroundColor: secondaryColor }}
                    >
                      Bouton secondaire
                    </button>
                  </div>
                  <div className="flex space-x-2">
                    <span 
                      className="px-2 py-1 rounded-full text-xs text-white"
                      style={{ backgroundColor: primaryColor }}
                    >
                      Badge primaire
                    </span>
                    <span 
                      className="px-2 py-1 rounded-full text-xs text-white"
                      style={{ backgroundColor: secondaryColor }}
                    >
                      Badge secondaire
                    </span>
                  </div>
                </div>
              </div>

              {/* Mode sombre */}
              <div className="flex items-center p-4 bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  name="darkModeDefault"
                  id="darkModeDefault"
                  checked={formData.darkModeDefault}
                  onChange={handleChange}
                  className="w-4 h-4 rounded focus:ring-2"
                  style={{ color: primaryColor }}
                />
                <label htmlFor="darkModeDefault" className="ml-2 text-gray-700">
                  Activer le mode sombre par défaut pour tous les utilisateurs
                </label>
              </div>
            </div>
          )}

          {/* Onglet Notifications */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FontAwesomeIcon icon={faEnvelope} className="mr-2" />
                  Email d'expédition des notifications
                </label>
                <input
                  type="email"
                  name="notificationEmail"
                  value={formData.notificationEmail}
                  onChange={handleChange}
                  placeholder="noreply@votre-entreprise.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Signature des emails
                </label>
                <textarea
                  name="emailSignature"
                  value={formData.emailSignature}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none resize-none"
                  placeholder="Signature ajoutée en bas des emails..."
                />
              </div>

              {/* Aperçu */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">Aperçu de l'email</h3>
                <div className="bg-white border rounded-lg p-4">
                  <p className="text-sm text-gray-600">
                    De : {formData.notificationEmail || formData.email || 'noreply@exemple.com'}
                  </p>
                  <p className="text-sm text-gray-600">Objet : Notification GuardTrack</p>
                  <div className="border-t my-3"></div>
                  <p className="text-gray-700">Bonjour,</p>
                  <p className="text-gray-700 mt-2">Ceci est un exemple de notification.</p>
                  <div className="border-t my-3"></div>
                  <p className="text-sm text-gray-600 whitespace-pre-line">{formData.emailSignature}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}