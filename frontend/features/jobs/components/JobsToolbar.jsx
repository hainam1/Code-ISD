import styles from './JobsToolbar.module.css';

const ALL_OPTION = 'all';

export default function JobsToolbar({
  searchTerm,
  onSearchTermChange,
  locationFilter,
  onLocationFilterChange,
  locationOptions,
  modeFilter,
  onModeFilterChange,
  modeOptions,
  onClearFilters,
  resultCount,
}) {
  return (
    <div className={styles.toolbar}>
      <div className={styles.heading}>
        <p className={styles.kicker}>LONG HAI SECURITY COMPANY</p>
        <h1 className={styles.title}>Các vị trí bảo vệ đang tuyển</h1>
        <p className={styles.resultText}>{resultCount} công việc phù hợp</p>
      </div>

      <div className={styles.controls}>
        <div className={styles.searchWrap}>
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => onSearchTermChange(event.target.value)}
            placeholder="Tìm kiếm theo tên việc, địa điểm, mô tả..."
            className={styles.searchInput}
            aria-label="Tìm kiếm công việc"
          />
        </div>

        <select
          value={locationFilter}
          onChange={(event) => onLocationFilterChange(event.target.value)}
          className={styles.filterSelect}
          aria-label="Lọc theo địa điểm"
        >
          <option value={ALL_OPTION}>Tất cả địa điểm</option>
          {locationOptions.map((location) => (
            <option key={location} value={location}>
              {location}
            </option>
          ))}
        </select>

        <select
          value={modeFilter}
          onChange={(event) => onModeFilterChange(event.target.value)}
          className={styles.filterSelect}
          aria-label="Lọc theo hình thức làm việc"
        >
          <option value={ALL_OPTION}>Tất cả hình thức</option>
          {modeOptions.map((mode) => (
            <option key={mode} value={mode}>
              {mode}
            </option>
          ))}
        </select>

        <button type="button" className={styles.clearButton} onClick={onClearFilters}>
          Đặt lại
        </button>
      </div>
    </div>
  );
}
