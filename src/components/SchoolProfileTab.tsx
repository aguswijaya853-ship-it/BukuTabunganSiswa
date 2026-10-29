import React, { useEffect, useState } from 'react';
import { Building2, Save } from 'lucide-react';
import { BLUEPRINT_LIMITS } from '../lib/validation';
import { saveSchoolProfile } from '../services/savingsService';
import type { SchoolProfile } from '../types';

interface SchoolProfileTabProps {
  ownerId: string;
  defaultTreasurerName: string;
  school: SchoolProfile | null;
  onNotify: (type: 'success' | 'error' | 'info', title: string, description?: string) => void;
}

export const SchoolProfileTab: React.FC<SchoolProfileTabProps> = ({
  ownerId,
  defaultTreasurerName,
  school,
  onNotify,
}) => {
  const [schoolName, setSchoolName] = useState('SD Negeri 01 Nusantara');
  const [schoolAddress, setSchoolAddress] = useState('');
  const [treasurerName, setTreasurerName] = useState(defaultTreasurerName);
  const [principalName, setPrincipalName] = useState('');
  const [academicYear, setAcademicYear] = useState('2026/2027');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (school) {
      setSchoolName(school.schoolName);
      setSchoolAddress(school.schoolAddress);
      setTreasurerName(school.treasurerName);
      setPrincipalName(school.principalName);
      setAcademicYear(school.academicYear);
    } else {
      setTreasurerName(defaultTreasurerName);
    }
  }, [school, defaultTreasurerName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveSchoolProfile(ownerId, {
        schoolName,
        schoolAddress,
        treasurerName,
        principalName,
        academicYear,
      });
      onNotify(
        'success',
        'Profil sekolah berhasil disimpan',
        'Kop surat dan nama penandatangan pada ekspor PDF/Excel telah diperbarui.'
      );
    } catch (err) {
      onNotify(
        'error',
        'Gagal menyimpan profil sekolah',
        err instanceof Error ? err.message : String(err)
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-3">
          <Building2 className="w-5 h-5 text-emerald-700 shrink-0" />
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Identitas Sekolah &amp; Penandatangan Laporan
            </h2>
            <p className="text-xs text-slate-500">
              Data ini dicetak otomatis pada kop surat PDF, slip transaksi, buku mutasi, dan Excel
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-1">
              <label className="block text-xs font-medium text-slate-700">
                Nama Resmi Sekolah / Madrasah <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                required
                minLength={BLUEPRINT_LIMITS.SCHOOL_NAME_MIN}
                maxLength={BLUEPRINT_LIMITS.SCHOOL_NAME_MAX}
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder="Contoh: SD Negeri 01 Nusantara"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700">
                Tahun Ajaran <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                required
                minLength={BLUEPRINT_LIMITS.ACADEMIC_YEAR_MIN}
                maxLength={BLUEPRINT_LIMITS.ACADEMIC_YEAR_MAX}
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                placeholder="2026/2027"
                className="w-full px-3 py-2 text-sm font-mono-num border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-700">Alamat Lengkap Sekolah</label>
            <input
              type="text"
              maxLength={BLUEPRINT_LIMITS.SCHOOL_ADDRESS_MAX}
              value={schoolAddress}
              onChange={(e) => setSchoolAddress(e.target.value)}
              placeholder="Contoh: Jl. Pendidikan No. 18, Kota Bandung"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700">
                Nama Bendahara Tabungan <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                required
                minLength={BLUEPRINT_LIMITS.TREASURER_NAME_MIN}
                maxLength={BLUEPRINT_LIMITS.TREASURER_NAME_MAX}
                value={treasurerName}
                onChange={(e) => setTreasurerName(e.target.value)}
                placeholder="Nama lengkap & gelar bendahara"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700">
                Nama Kepala Sekolah (Mengetahui)
              </label>
              <input
                type="text"
                maxLength={BLUEPRINT_LIMITS.PRINCIPAL_NAME_MAX}
                value={principalName}
                onChange={(e) => setPrincipalName(e.target.value)}
                placeholder="Nama lengkap & gelar kepala sekolah"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 disabled:opacity-60 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Menyimpan...' : 'Simpan Pengaturan Sekolah'}</span>
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};
