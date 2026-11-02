-- =====================================================================
-- erd_tieng_viet.sql — CHỈ DÙNG ĐỂ VẼ ERD (tên thực thể theo thực thể.docx)
--
-- Database thật vẫn là database/schema.sql (tên tiếng Anh).
-- Bảng ánh xạ tên tiếng Việt ↔ tên thật: docs/ANH_XA_THUC_THE.md
-- Sửa schema.sql thì phải sửa file này theo.
--
-- Vẽ ERD: MySQL Workbench → File → New Model → File → Import →
--   Reverse Engineer MySQL Create Script… → chọn file này,
--   tick "Place imported objects on a diagram".
-- =====================================================================

CREATE DATABASE IF NOT EXISTS thuvien_thpt_erd
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE thuvien_thpt_erd;

-- ---------------------------------------------------------------------
-- TÀI KHOẢN, ĐỘC GIẢ, THẺ THƯ VIỆN
-- ---------------------------------------------------------------------

CREATE TABLE VaiTro (
  maVaiTro  INT NOT NULL AUTO_INCREMENT,
  tenVaiTro VARCHAR(50) NOT NULL,
  PRIMARY KEY (maVaiTro),
  UNIQUE KEY uq_vaitro_ten (tenVaiTro)
) ENGINE = InnoDB;

CREATE TABLE TaiKhoan (
  maTaiKhoan  INT NOT NULL AUTO_INCREMENT,
  tenDangNhap VARCHAR(50)  NOT NULL,
  matKhau     VARCHAR(255) NOT NULL,
  hoTen       VARCHAR(100) NOT NULL,
  email       VARCHAR(100) DEFAULT NULL,
  soDienThoai VARCHAR(20)  DEFAULT NULL,
  maVaiTro    INT NOT NULL,
  trangThai   ENUM('ACTIVE', 'LOCKED') NOT NULL DEFAULT 'ACTIVE',
  ngayTao     DATETIME NOT NULL,
  ngayCapNhat DATETIME NOT NULL,
  PRIMARY KEY (maTaiKhoan),
  UNIQUE KEY uq_taikhoan_ten (tenDangNhap),
  CONSTRAINT fk_taikhoan_vaitro FOREIGN KEY (maVaiTro) REFERENCES VaiTro (maVaiTro)
) ENGINE = InnoDB;

CREATE TABLE DocGia (
  maDocGia     INT NOT NULL AUTO_INCREMENT,
  maTaiKhoan   INT DEFAULT NULL,
  maSoDocGia   VARCHAR(20)  NOT NULL,
  hoTen        VARCHAR(100) NOT NULL,
  vaiTroDocGia ENUM('STUDENT', 'TEACHER') NOT NULL,
  lop          VARCHAR(20)  DEFAULT NULL,
  toBoMon      VARCHAR(50)  DEFAULT NULL,
  email        VARCHAR(100) DEFAULT NULL,
  ngaySinh     DATE DEFAULT NULL,
  ngayTao      DATETIME NOT NULL,
  ngayCapNhat  DATETIME NOT NULL,
  PRIMARY KEY (maDocGia),
  UNIQUE KEY uq_docgia_taikhoan (maTaiKhoan),
  UNIQUE KEY uq_docgia_maso (maSoDocGia),
  CONSTRAINT fk_docgia_taikhoan FOREIGN KEY (maTaiKhoan) REFERENCES TaiKhoan (maTaiKhoan)
) ENGINE = InnoDB;

CREATE TABLE TheThuVien (
  maThe        INT NOT NULL AUTO_INCREMENT,
  maDocGia     INT NOT NULL,
  ngayCap      DATE NOT NULL,
  ngayHetHan   DATE NOT NULL,
  trangThaiThe ENUM('ACTIVE', 'LOCKED') NOT NULL DEFAULT 'ACTIVE',
  ngayTao      DATETIME NOT NULL,
  ngayCapNhat  DATETIME NOT NULL,
  PRIMARY KEY (maThe),
  UNIQUE KEY uq_the_docgia (maDocGia),
  CONSTRAINT fk_the_docgia FOREIGN KEY (maDocGia) REFERENCES DocGia (maDocGia)
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- SÁCH
-- ---------------------------------------------------------------------

CREATE TABLE TheLoai (
  maTheLoai  INT NOT NULL AUTO_INCREMENT,
  tenTheLoai VARCHAR(100) NOT NULL,
  moTa       TEXT,
  PRIMARY KEY (maTheLoai),
  UNIQUE KEY uq_theloai_ten (tenTheLoai)
) ENGINE = InnoDB;

CREATE TABLE DauSach (
  maDauSach   INT NOT NULL AUTO_INCREMENT,
  isbn        CHAR(13)     NOT NULL,
  tenSach     VARCHAR(255) NOT NULL,
  tacGia      VARCHAR(150) NOT NULL,
  nhaXuatBan  VARCHAR(150) NOT NULL,
  namXuatBan  SMALLINT     NOT NULL,
  maTheLoai   INT NOT NULL,
  moTa        TEXT,
  trangThaiAn BOOLEAN NOT NULL DEFAULT FALSE,
  ngayTao     DATETIME NOT NULL,
  ngayCapNhat DATETIME NOT NULL,
  PRIMARY KEY (maDauSach),
  UNIQUE KEY uq_dausach_isbn (isbn),
  CONSTRAINT fk_dausach_theloai FOREIGN KEY (maTheLoai) REFERENCES TheLoai (maTheLoai)
) ENGINE = InnoDB;

CREATE TABLE BanSach (
  maBanSach   INT NOT NULL AUTO_INCREMENT,
  maDauSach   INT NOT NULL,
  maSoBanSach VARCHAR(50) DEFAULT NULL,
  trangThai   ENUM('AVAILABLE', 'BORROWED', 'DAMAGED', 'LOST') NOT NULL DEFAULT 'AVAILABLE',
  viTri       VARCHAR(100) DEFAULT NULL,
  ghiChu      VARCHAR(255) DEFAULT NULL,
  ngayTao     DATETIME NOT NULL,
  ngayCapNhat DATETIME NOT NULL,
  PRIMARY KEY (maBanSach),
  UNIQUE KEY uq_bansach_maso (maSoBanSach),
  CONSTRAINT fk_bansach_dausach FOREIGN KEY (maDauSach) REFERENCES DauSach (maDauSach)
) ENGINE = InnoDB;

CREATE TABLE LichSuTrangThaiBanSach (
  maLichSu     INT NOT NULL AUTO_INCREMENT,
  maBanSach    INT NOT NULL,
  trangThaiCu  ENUM('AVAILABLE', 'BORROWED', 'DAMAGED', 'LOST') NOT NULL,
  trangThaiMoi ENUM('AVAILABLE', 'BORROWED', 'DAMAGED', 'LOST') NOT NULL,
  lyDo         VARCHAR(255) DEFAULT NULL,
  nguoiDoi     INT NOT NULL,
  thoiDiem     DATETIME NOT NULL,
  PRIMARY KEY (maLichSu),
  CONSTRAINT fk_lstt_bansach FOREIGN KEY (maBanSach) REFERENCES BanSach (maBanSach),
  CONSTRAINT fk_lstt_taikhoan FOREIGN KEY (nguoiDoi) REFERENCES TaiKhoan (maTaiKhoan)
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- QUY ĐỊNH
-- ---------------------------------------------------------------------

CREATE TABLE QuyDinh (
  maPhienBan   INT NOT NULL AUTO_INCREMENT,
  vaiTroApDung ENUM('STUDENT', 'TEACHER') NOT NULL,
  soSachToiDa  INT NOT NULL,
  soNgayMuon   INT NOT NULL,
  phatNgay     INT NOT NULL,
  phatToiDa    INT NOT NULL,
  soNgayGiaHan INT NOT NULL,
  ngayHieuLuc  DATE NOT NULL,
  nguoiTao     INT NOT NULL,
  ngayTao      DATETIME NOT NULL,
  PRIMARY KEY (maPhienBan),
  UNIQUE KEY uq_quydinh_vaitro_ngay (vaiTroApDung, ngayHieuLuc),
  CONSTRAINT fk_quydinh_taikhoan FOREIGN KEY (nguoiTao) REFERENCES TaiKhoan (maTaiKhoan)
) ENGINE = InnoDB;

CREATE TABLE NhatKyQuyDinh (
  maNhatKy         INT NOT NULL AUTO_INCREMENT,
  loaiThayDoi      ENUM('CONFIG', 'APPLY_ACTIVE_LOANS') NOT NULL,
  vaiTroApDung     ENUM('STUDENT', 'TEACHER') DEFAULT NULL,
  maPhienBan       INT DEFAULT NULL,
  giaTriCu         JSON DEFAULT NULL,
  giaTriMoi        JSON NOT NULL,
  ngayHieuLuc      DATE DEFAULT NULL,
  lyDo             VARCHAR(255) DEFAULT NULL,
  soPhieuAnhHuong  INT DEFAULT NULL,
  nguoiDoi         INT NOT NULL,
  thoiDiem         DATETIME NOT NULL,
  PRIMARY KEY (maNhatKy),
  CONSTRAINT fk_nkqd_quydinh FOREIGN KEY (maPhienBan) REFERENCES QuyDinh (maPhienBan),
  CONSTRAINT fk_nkqd_taikhoan FOREIGN KEY (nguoiDoi) REFERENCES TaiKhoan (maTaiKhoan)
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- MƯỢN – TRẢ
-- ---------------------------------------------------------------------

-- soNgayMuon, phatNgay, phatToiDa, soNgayGiaHan: snapshot quy định lúc lập phiếu.
CREATE TABLE PhieuMuon (
  maPhieu          INT NOT NULL AUTO_INCREMENT,
  maDocGia         INT NOT NULL,
  maThuThuLap      INT NOT NULL,
  maPhienBan       INT NOT NULL,
  ngayLap          DATE NOT NULL,
  soNgayMuon       INT NOT NULL,
  phatNgay         INT NOT NULL,
  phatToiDa        INT NOT NULL,
  soNgayGiaHan     INT NOT NULL,
  trangThaiPhieu   ENUM('BORROWING', 'COMPLETED') NOT NULL DEFAULT 'BORROWING',
  thoiDiemHoanTat  DATETIME DEFAULT NULL,
  ngayTao          DATETIME NOT NULL,
  PRIMARY KEY (maPhieu),
  CONSTRAINT fk_phieu_docgia FOREIGN KEY (maDocGia) REFERENCES DocGia (maDocGia),
  CONSTRAINT fk_phieu_thuthu FOREIGN KEY (maThuThuLap) REFERENCES TaiKhoan (maTaiKhoan),
  CONSTRAINT fk_phieu_quydinh FOREIGN KEY (maPhienBan) REFERENCES QuyDinh (maPhienBan)
) ENGINE = InnoDB;

CREATE TABLE ChiTietPhieuMuon (
  maChiTiet     INT NOT NULL AUTO_INCREMENT,
  maPhieu       INT NOT NULL,
  maBanSach     INT NOT NULL,
  hanTra        DATE NOT NULL,
  soLanGiaHan   INT NOT NULL DEFAULT 0,
  ngayTra       DATETIME DEFAULT NULL,
  tinhTrangSach ENUM('GOOD', 'DAMAGED', 'LOST') DEFAULT NULL,
  ghiChu        VARCHAR(255) DEFAULT NULL,
  soNgayTre     INT DEFAULT NULL,
  tienPhat      INT DEFAULT NULL,
  nguoiNhan     INT DEFAULT NULL,
  PRIMARY KEY (maChiTiet),
  UNIQUE KEY uq_chitiet_phieu_bansach (maPhieu, maBanSach),
  CONSTRAINT fk_chitiet_phieu FOREIGN KEY (maPhieu) REFERENCES PhieuMuon (maPhieu),
  CONSTRAINT fk_chitiet_bansach FOREIGN KEY (maBanSach) REFERENCES BanSach (maBanSach),
  CONSTRAINT fk_chitiet_nguoinhan FOREIGN KEY (nguoiNhan) REFERENCES TaiKhoan (maTaiKhoan)
) ENGINE = InnoDB;

CREATE TABLE LichSuGiaHan (
  maGiaHan       INT NOT NULL AUTO_INCREMENT,
  maChiTiet      INT NOT NULL,
  hanTraCu       DATE NOT NULL,
  hanTraMoi      DATE NOT NULL,
  maThuThu       INT NOT NULL,
  thoiDiemGiaHan DATETIME NOT NULL,
  PRIMARY KEY (maGiaHan),
  CONSTRAINT fk_giahan_chitiet FOREIGN KEY (maChiTiet) REFERENCES ChiTietPhieuMuon (maChiTiet),
  CONSTRAINT fk_giahan_thuthu FOREIGN KEY (maThuThu) REFERENCES TaiKhoan (maTaiKhoan)
) ENGINE = InnoDB;

CREATE TABLE ThayDoiSnapshotPhieu (
  maThayDoi INT NOT NULL AUTO_INCREMENT,
  maNhatKy  INT NOT NULL,
  maPhieu   INT NOT NULL,
  giaTriCu  JSON NOT NULL,
  giaTriMoi JSON NOT NULL,
  PRIMARY KEY (maThayDoi),
  CONSTRAINT fk_tdsp_nhatky FOREIGN KEY (maNhatKy) REFERENCES NhatKyQuyDinh (maNhatKy),
  CONSTRAINT fk_tdsp_phieu FOREIGN KEY (maPhieu) REFERENCES PhieuMuon (maPhieu)
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- TIỀN PHẠT (gồm luôn phần thu: thoiDiemThu, nguoiThu; mã biên lai = 'BL' + maKhoanPhat)
-- ---------------------------------------------------------------------

CREATE TABLE KhoanPhat (
  maKhoanPhat INT NOT NULL AUTO_INCREMENT,
  maChiTiet   INT NOT NULL,
  maDocGia    INT NOT NULL,
  soNgayTre   INT NOT NULL,
  soTienPhat  INT NOT NULL,
  lyDo        VARCHAR(255) DEFAULT NULL,
  trangThai   ENUM('UNPAID', 'PAID') NOT NULL DEFAULT 'UNPAID',
  ngayTao     DATETIME NOT NULL,
  thoiDiemThu DATETIME DEFAULT NULL,
  nguoiThu    INT DEFAULT NULL,
  PRIMARY KEY (maKhoanPhat),
  UNIQUE KEY uq_khoanphat_chitiet (maChiTiet),
  CONSTRAINT fk_khoanphat_chitiet FOREIGN KEY (maChiTiet) REFERENCES ChiTietPhieuMuon (maChiTiet),
  CONSTRAINT fk_khoanphat_docgia FOREIGN KEY (maDocGia) REFERENCES DocGia (maDocGia),
  CONSTRAINT fk_khoanphat_nguoithu FOREIGN KEY (nguoiThu) REFERENCES TaiKhoan (maTaiKhoan)
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- NHẬT KÝ HỆ THỐNG, NHẮC HẠN
-- ---------------------------------------------------------------------

CREATE TABLE NhatKyHeThong (
  maNhatKy     INT NOT NULL AUTO_INCREMENT,
  maTaiKhoan   INT DEFAULT NULL,
  hanhDong     VARCHAR(50) NOT NULL,
  loaiDoiTuong VARCHAR(50) DEFAULT NULL,
  maDoiTuong   INT DEFAULT NULL,
  chiTiet      JSON DEFAULT NULL,
  diaChiIP     VARCHAR(45) DEFAULT NULL,
  thoiDiem     DATETIME NOT NULL,
  PRIMARY KEY (maNhatKy),
  CONSTRAINT fk_nkht_taikhoan FOREIGN KEY (maTaiKhoan) REFERENCES TaiKhoan (maTaiKhoan)
) ENGINE = InnoDB;

CREATE TABLE NhatKyNhacHan (
  maNhacHan   INT NOT NULL AUTO_INCREMENT,
  maChiTiet   INT NOT NULL,
  email       VARCHAR(100) NOT NULL,
  nguoiGui    INT NOT NULL,
  thoiDiemGui DATETIME NOT NULL,
  thanhCong   BOOLEAN NOT NULL,
  noiDungLoi  VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (maNhacHan),
  CONSTRAINT fk_nhachan_chitiet FOREIGN KEY (maChiTiet) REFERENCES ChiTietPhieuMuon (maChiTiet),
  CONSTRAINT fk_nhachan_taikhoan FOREIGN KEY (nguoiGui) REFERENCES TaiKhoan (maTaiKhoan)
) ENGINE = InnoDB;
