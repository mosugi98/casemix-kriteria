# Kriteria Diagnosis Casemix

Asisten verifikasi untuk coder casemix: tempel diagnosis, lihat daftar kriteria tiap diagnosis, centang terpenuhi atau tidak. Semua berjalan di browser. Tidak ada server, tidak ada penyimpanan data pasien.

**Jangan menempel nama pasien atau nomor RM.**

## Cara pakai
1. Buka halaman, tempel diagnosis (satu per baris atau dipisah titik koma; kode ICD-10, nama, atau campuran).
2. Klik **Identifikasi**. Diagnosis yang tidak pasti ditampilkan sebagai pilihan atau kotak pencarian; tidak ada yang dibuang.
3. Centang kriteria. Status **Terpenuhi** muncul bila semua kriteria `wajib` tercentang.
4. **Salin hasil** untuk ditempel kembali ke SIMGOS.

## Memperbarui kriteria (admin / casemix)
Edit `data/kriteria.csv` langsung di github.com lalu commit. Kolom: `kode`, `uraian` (atau `kriteria`, seperti hasil unduhan aplikasi lama; kolom `nama` boleh ada), `jenis` (satu baris = satu kriteria; `jenis` = `wajib` atau lainnya, misalnya `pendukung`; yang bukan `wajib` hanya informasi). Periksa dengan:

```
node scripts/validate-data.js
```

Kriteria pribadi (hanya di satu browser) dapat diimpor lewat bagian "Impor kriteria pribadi" di halaman.

## Pengembangan
```
npm test                       # uji (Node 20+, tanpa dependensi)
node scripts/validate-data.js  # periksa berkas data
```
Tanpa langkah build. Untuk mencoba lokal, layani folder ini dengan server statis apa pun (halaman memuat berkas CSV dengan `fetch`, jadi tidak bisa dibuka lewat `file://`).

## Dipasang di server rumah sakit
Folder ini hanya berisi berkas statis. Salin ke server web internal (IIS, nginx, dsb.) maka halaman hanya terlihat di jaringan rumah sakit.

## Data
- `data/icd10.csv`: daftar kode ICD-10 (kode, nama).
- `data/sinonim.csv`: istilah lain menuju kode.
- `data/kriteria.csv`: kriteria per diagnosis.
