<template>
  <article class="care-report-detail" data-testid="healthcare-report-detail">
    <header class="care-report-detail__header">
      <button type="button" class="care-detail-back" @click="$emit('back')">
        <i class="fas fa-arrow-left" aria-hidden="true"></i>
        <span>{{ copy.back }}</span>
      </button>
      <span class="care-report-detail__seal" aria-hidden="true">
        <i class="fas fa-file-shield"></i>
      </span>
      <div class="care-report-detail__heading">
        <span class="care-kicker">{{ copy.authored }}</span>
        <h2>{{ report.title }}</h2>
        <p>{{ report.institution }}</p>
      </div>
      <span class="care-revision-chip">{{ copy.revision }} {{ report.revision }}</span>
    </header>

    <div v-if="report.status === 'unavailable'" class="care-source-unavailable" data-testid="healthcare-report-unavailable">
      <i class="fas fa-file-circle-xmark" aria-hidden="true"></i>
      <h3>{{ copy.unavailableTitle }}</h3>
      <p>{{ report.summary }}</p>
      <p>{{ copy.unavailableBody }}</p>
    </div>

    <template v-else>
      <section class="care-report-summary">
        <div>
          <span>{{ copy.issued }}</span>
          <strong>{{ report.issuedLabel }}</strong>
        </div>
        <p>{{ report.summary }}</p>
      </section>

      <section v-if="report.correction" class="care-correction" data-testid="healthcare-report-correction">
        <i class="fas fa-rotate" aria-hidden="true"></i>
        <div>
          <strong>{{ copy.corrected }}</strong>
          <p>{{ report.correction }}</p>
        </div>
      </section>

      <section class="care-results" :aria-labelledby="`${report.id}-results`">
        <div class="care-results__title">
          <div>
            <span class="care-kicker">{{ copy.resultsKicker }}</span>
            <h3 :id="`${report.id}-results`">{{ copy.results }}</h3>
          </div>
          <span>{{ report.rows.length }} {{ copy.items }}</span>
        </div>
        <div class="care-results__scroller" tabindex="0" :aria-label="copy.tableLabel">
          <table>
            <thead>
              <tr>
                <th scope="col">{{ copy.item }}</th>
                <th scope="col">{{ copy.value }}</th>
                <th scope="col">{{ copy.unit }}</th>
                <th scope="col">{{ copy.reference }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in report.rows" :key="row.id" :class="`is-${row.flag}`">
                <th scope="row">{{ row.item }}</th>
                <td class="care-results__value">{{ row.value }}</td>
                <td>{{ row.unit || '—' }}</td>
                <td>{{ row.reference }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="care-report-boundary">
        <i class="fas fa-circle-info" aria-hidden="true"></i>
        <p>{{ copy.boundary }}</p>
      </section>

      <button
        v-if="report.status === 'corrected' && !revisionAcknowledged"
        type="button"
        class="care-primary-button care-report-detail__ack"
        data-testid="healthcare-report-acknowledge"
        @click="$emit('acknowledge')"
      >
        {{ copy.acknowledge }}
      </button>
    </template>
  </article>
</template>

<script setup>
defineProps({
  report: { type: Object, required: true },
  copy: { type: Object, required: true },
  revisionAcknowledged: { type: Boolean, default: false },
})

defineEmits(['back', 'acknowledge'])
</script>
