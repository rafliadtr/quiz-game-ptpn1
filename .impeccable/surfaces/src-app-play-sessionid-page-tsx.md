---
version: 1
slug: "src-app-play-sessionid-page-tsx"
primary_target: "src/app/play/[sessionId]/page.tsx"
related_targets: ["src/app/page.tsx","src/app/result/[sessionId]/page.tsx","src/components/StartForm.tsx"]
---

# Surface brief: alur kuis (mulai, main, hasil)

Scope: `src/app/page.tsx` (+ `src/components/StartForm.tsx`), `src/app/play/[sessionId]/page.tsx`, `src/app/result/[sessionId]/page.tsx`. Mode: Experience. Mobile-first (event di HP), juga dipakai di desktop.

Audience/job: staf Head Office memilih divisi, menjawab 10 soal x 15 detik, lalu belajar dari pembahasan. Constraint: rasio warna 60% putih, 30% hijau PTPN, 10% jingga (dipin pengguna); biru logo hanya di logo. Animasi wajib di: reaksi benar/salah, pergantian soal + timer, layar hasil.

Unresolved: logo resmi PTPN I belum ada di repo; kode hex resmi belum dikonfirmasi (warna diambil dari foto logo dinding).

## Direction contract

THESIS: Satu sesi adalah satu perjalanan kereta di jalur hijau divisimu: 10 soal = 10 stasiun. Menolak ubin warna-warni kuis standar dan kartu kertas di atas latar navy.

OWN-WORLD: Putih rambu sebagai lantai (60%). Hijau PTPN #1E7B3C memegang garis jalur, strip nama jalur, dan papan stasiun (30%). Jingga #F39321 hanya untuk "posisi kamu", timer, dan tombol utama (10%). Tinta marun gelap dari wordmark. Barlow Condensed untuk nama stasiun dan angka, Barlow untuk teks. Titik stasiun bulat bergaris tebal, papan bersudut 10px seperti panel enamel, lencana kode divisi putih di strip hijau. Benar = titik terisi + centang, salah = cincin merah + silang.

STORY: Pemain mengenali divisinya sebagai jalurnya, berangkat, melewati 10 stasiun dengan status tercap, lalu melihat seluruh perjalanannya dan membaca pembahasan per stasiun.

FIRST VIEWPORT: Main (390 lebar): strip hijau berisi lencana kode divisi, nama jalur, skor. Di bawahnya peta 10 stasiun selebar layar dengan penanda jingga di stasiun aktif dan timer jingga yang menyusut di bawah garis. Papan hijau memuat soal dalam Barlow Condensed besar. Empat pintu A sampai D putih berbingkai di bawahnya. Mulai: judul besar, lencana divisi sebagai legenda jalur, papan keberangkatan hijau dengan rute 10 stasiun, tombol jingga "Berangkat". Hasil: skor besar dan peta perjalanan bercap, pembahasan per stasiun di sepanjang garis vertikal. Signature interaction: penanda jingga meluncur ke stasiun berikutnya; stasiun dicap saat dijawab; poin melayang naik; goyang saat salah; timer berdenyut di 5 detik terakhir; di hasil, garis digambar ulang stasiun demi stasiun.

FORM: Peta Jalur Divisi, kandidat ke-7 dari daftar grounded (diundi). seed:28869aacd14cf172

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
