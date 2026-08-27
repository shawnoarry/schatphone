<script setup>
import { computed, watch } from 'vue'
import { useI18n } from '../../composables/useI18n'
import {
  CONTACTS_ENTITY_TYPES,
  PROFILE_TEMPLATE_FIELD_PURPOSES,
  PROFILE_TEMPLATE_FIELD_TYPES,
  PROFILE_VISIBILITY_LEVELS,
  listAllowedProfileTemplateFieldPurposes,
} from '../../lib/profile-template-schema'
import { useWorldBookProfileTemplateEditor } from '../../composables/useWorldBookProfileTemplateEditor'

const props = defineProps({
  template: {
    type: Object,
    required: true,
  },
  isNew: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['cancel', 'save'])
const { t } = useI18n()

const {
  addCategory,
  addField,
  buildSaveInput,
  canSave,
  cancelDeleteCategory,
  confirmDeleteCategory,
  draft,
  loadTemplate,
  moveCategory,
  moveField,
  orderedCategories,
  pendingCategoryDelete,
  removeField,
  requestDeleteCategory,
  toggleFieldEntityType,
  toggleFieldPurpose,
  updateFieldType,
} = useWorldBookProfileTemplateEditor({ initialTemplate: props.template })

const notice = computed(() => {
  if (pendingCategoryDelete.categoryId) {
    const category = draft.categories.find((item) => item.id === pendingCategoryDelete.categoryId)
    const fieldCount = draft.fields.filter(
      (field) => field.categoryId === pendingCategoryDelete.categoryId,
    ).length
    return t(
      `删除「${category?.label || '这个类目'}」前，请选择 ${fieldCount} 个字段要移动到哪里。`,
      `Before deleting “${category?.label || 'this category'}”, choose where its ${fieldCount} fields should move.`,
    )
  }
  if (!String(draft.title || '').trim()) {
    return t('填写模板名称后才能保存。', 'Add a template name before saving.')
  }
  return t(
    '所有修改都只在这份草稿里；按保存后才会生成模板新版本。',
    'All changes stay in this draft until Save creates the next template version.',
  )
})

const fieldTypeOptions = computed(() => [
  { value: PROFILE_TEMPLATE_FIELD_TYPES.SHORT_TEXT, label: t('短文本', 'Short text') },
  { value: PROFILE_TEMPLATE_FIELD_TYPES.LONG_TEXT, label: t('长文本', 'Long text') },
  { value: PROFILE_TEMPLATE_FIELD_TYPES.SINGLE_SELECT, label: t('单选', 'Single choice') },
  { value: PROFILE_TEMPLATE_FIELD_TYPES.MULTI_SELECT_TAGS, label: t('多选标签', 'Multiple tags') },
  { value: PROFILE_TEMPLATE_FIELD_TYPES.DATE, label: t('日期', 'Date') },
  { value: PROFILE_TEMPLATE_FIELD_TYPES.BOOLEAN, label: t('是 / 否', 'Yes / No') },
  { value: PROFILE_TEMPLATE_FIELD_TYPES.PERSON_REFERENCE, label: t('人物引用', 'Person reference') },
  { value: PROFILE_TEMPLATE_FIELD_TYPES.ORGANIZATION_REFERENCE, label: t('组织引用', 'Organization reference') },
])

const visibilityOptions = computed(() => [
  { value: PROFILE_VISIBILITY_LEVELS.PUBLIC, label: t('公开资料', 'Public') },
  { value: PROFILE_VISIBILITY_LEVELS.FAMILIAR, label: t('熟悉后知道', 'Familiar') },
  { value: PROFILE_VISIBILITY_LEVELS.INTIMATE, label: t('亲密后知道', 'Intimate') },
  { value: PROFILE_VISIBILITY_LEVELS.HIDDEN, label: t('隐藏设定', 'Hidden') },
  { value: PROFILE_VISIBILITY_LEVELS.WORLD_SPECIFIC, label: t('世界专属', 'World-specific') },
])

const entityTypeOptions = computed(() => [
  { value: CONTACTS_ENTITY_TYPES.SELF_PROFILE, label: t('用户自己', 'Self Profile') },
  { value: CONTACTS_ENTITY_TYPES.MAIN_ROLE, label: t('主要角色', 'Main Role') },
  { value: CONTACTS_ENTITY_TYPES.SUPPORTING_ROLE, label: t('次要角色', 'Supporting Role') },
  { value: CONTACTS_ENTITY_TYPES.NPC, label: t('世界 NPC', 'World NPC') },
])

const purposeOptions = computed(() => [
  {
    value: PROFILE_TEMPLATE_FIELD_PURPOSES.CHAT_CONTEXT,
    label: t('帮助聊天理解', 'Chat context'),
  },
  {
    value: PROFILE_TEMPLATE_FIELD_PURPOSES.EVENT_ELIGIBILITY,
    label: t('可供事件判断', 'Event eligibility'),
  },
  {
    value: PROFILE_TEMPLATE_FIELD_PURPOSES.WORK_HUB_MATCHING,
    label: t('可供工作匹配', 'Work Hub matching'),
  },
  {
    value: PROFILE_TEMPLATE_FIELD_PURPOSES.PUBLIC_CONTENT,
    label: t('可供公开内容读取', 'Public content'),
  },
])

const supportsOptions = (field) => [
  PROFILE_TEMPLATE_FIELD_TYPES.SINGLE_SELECT,
  PROFILE_TEMPLATE_FIELD_TYPES.MULTI_SELECT_TAGS,
].includes(field?.type)

const purposeAllowed = (field, purpose) =>
  listAllowedProfileTemplateFieldPurposes(field?.type).includes(purpose)

const fieldTypeLabel = (field) =>
  fieldTypeOptions.value.find((option) => option.value === field?.type)?.label || t('字段', 'Field')

const handleDeleteCategory = (categoryId) => {
  const result = requestDeleteCategory(categoryId)
  if (result.reason === 'destination_required') {
    addCategory(t('其他资料', 'Other details'))
    requestDeleteCategory(categoryId)
  }
}

const handleSave = () => {
  if (!canSave.value) return
  emit('save', buildSaveInput())
}

watch(
  () => props.template,
  (template) => loadTemplate(template),
  { immediate: true },
)
</script>

<template>
  <section class="profile-template-editor" data-testid="worldbook-profile-template-editor">
    <header class="profile-template-editor__header">
      <div>
        <p>{{ isNew ? t('新建资料卡', 'New profile card') : t('编辑资料卡', 'Edit profile card') }}</p>
        <h3>{{ draft.title || t('未命名资料卡', 'Untitled profile card') }}</h3>
        <span>{{ notice }}</span>
      </div>
      <span class="profile-template-editor__version">
        {{ isNew ? t('保存后创建 v1', 'Creates v1 on save') : `v${draft.version || 1}` }}
      </span>
    </header>

    <div class="profile-template-editor__identity">
      <label>
        <span>{{ t('模板名称', 'Template name') }}</span>
        <input
          v-model="draft.title"
          data-testid="worldbook-profile-template-title"
          :placeholder="t('例如：现代娱乐圈人物资料', 'Example: Modern entertainment profile')"
        />
      </label>
      <label>
        <span>{{ t('简短说明', 'Short description') }}</span>
        <textarea
          v-model="draft.description"
          data-testid="worldbook-profile-template-description"
          rows="2"
          :placeholder="t('说明这张资料卡适合什么世界和人物。', 'Explain which world and people this profile card fits.')"
        ></textarea>
      </label>
    </div>

    <div class="profile-template-editor__categories">
      <article
        v-for="(category, categoryIndex) in orderedCategories"
        :key="category.id"
        class="profile-template-category"
        :data-testid="`worldbook-profile-category-${category.id}`"
      >
        <div class="profile-template-category__head">
          <div class="profile-template-category__title">
            <span>{{ t('资料类目', 'Profile category') }}</span>
            <input
              v-model="draft.categories[categoryIndex].label"
              :data-testid="`worldbook-profile-category-label-${category.id}`"
              :aria-label="t('类目名称', 'Category name')"
            />
          </div>
          <div class="profile-template-editor__icon-actions">
            <button
              type="button"
              :disabled="categoryIndex === 0"
              :title="t('上移类目', 'Move category up')"
              @click="moveCategory(category.id, -1)"
            >
              <i class="fas fa-arrow-up" aria-hidden="true"></i>
            </button>
            <button
              type="button"
              :disabled="categoryIndex === orderedCategories.length - 1"
              :title="t('下移类目', 'Move category down')"
              @click="moveCategory(category.id, 1)"
            >
              <i class="fas fa-arrow-down" aria-hidden="true"></i>
            </button>
            <button
              type="button"
              class="is-danger"
              :title="t('删除类目', 'Delete category')"
              :data-testid="`worldbook-profile-category-delete-${category.id}`"
              @click="handleDeleteCategory(category.id)"
            >
              <i class="fas fa-trash" aria-hidden="true"></i>
            </button>
          </div>
        </div>

        <textarea
          v-model="draft.categories[categoryIndex].description"
          class="profile-template-category__description"
          rows="1"
          :aria-label="t('类目说明', 'Category description')"
          :placeholder="t('可选：说明这一组资料记录什么。', 'Optional: explain what belongs in this section.')"
        ></textarea>

        <div
          v-if="pendingCategoryDelete.categoryId === category.id"
          class="profile-template-category__delete-review"
          data-testid="worldbook-profile-category-delete-review"
        >
          <p>{{ notice }}</p>
          <select
            v-model="pendingCategoryDelete.destinationCategoryId"
            data-testid="worldbook-profile-category-delete-destination"
          >
            <option
              v-for="destination in draft.categories.filter((item) => item.id !== category.id)"
              :key="destination.id"
              :value="destination.id"
            >
              {{ destination.label }}
            </option>
          </select>
          <div>
            <button type="button" @click="cancelDeleteCategory">
              {{ t('保留类目', 'Keep category') }}
            </button>
            <button
              type="button"
              class="is-danger"
              data-testid="worldbook-profile-category-delete-confirm"
              @click="confirmDeleteCategory"
            >
              {{ t('移动字段并删除', 'Move fields and delete') }}
            </button>
          </div>
        </div>

        <div class="profile-template-category__fields">
          <article
            v-for="(field, fieldIndex) in category.fields"
            :key="field.id"
            class="profile-template-field"
            :data-testid="`worldbook-profile-field-card-${field.id}`"
          >
            <div class="profile-template-field__head">
              <div>
                <span>{{ fieldTypeLabel(field) }}</span>
                <strong>{{ field.label || t('未命名字段', 'Untitled field') }}</strong>
              </div>
              <div class="profile-template-editor__icon-actions">
                <button
                  type="button"
                  :disabled="fieldIndex === 0"
                  :title="t('上移字段', 'Move field up')"
                  @click="moveField(field.id, -1)"
                >
                  <i class="fas fa-arrow-up" aria-hidden="true"></i>
                </button>
                <button
                  type="button"
                  :disabled="fieldIndex === category.fields.length - 1"
                  :title="t('下移字段', 'Move field down')"
                  @click="moveField(field.id, 1)"
                >
                  <i class="fas fa-arrow-down" aria-hidden="true"></i>
                </button>
                <button
                  type="button"
                  class="is-danger"
                  :title="t('删除字段', 'Delete field')"
                  :data-testid="`worldbook-profile-field-delete-${field.id}`"
                  @click="removeField(field.id)"
                >
                  <i class="fas fa-trash" aria-hidden="true"></i>
                </button>
              </div>
            </div>

            <div class="profile-template-field__grid">
              <label>
                <span>{{ t('显示名称', 'Display name') }}</span>
                <input
                  v-model="field.label"
                  :data-testid="`worldbook-profile-field-label-${field.id}`"
                />
              </label>
              <label>
                <span>{{ t('填写方式', 'Input type') }}</span>
                <select
                  v-model="field.type"
                  :data-testid="`worldbook-profile-field-type-${field.id}`"
                  @change="updateFieldType(field)"
                >
                  <option v-for="option in fieldTypeOptions" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>
              </label>
              <label>
                <span>{{ t('所在类目', 'Category') }}</span>
                <select
                  v-model="field.categoryId"
                  :data-testid="`worldbook-profile-field-category-${field.id}`"
                >
                  <option v-for="option in draft.categories" :key="option.id" :value="option.id">
                    {{ option.label }}
                  </option>
                </select>
              </label>
              <label>
                <span>{{ t('默认可见范围', 'Default visibility') }}</span>
                <select v-model="field.defaultVisibilityLevel">
                  <option v-for="option in visibilityOptions" :key="option.value" :value="option.value">
                    {{ option.label }}
                  </option>
                </select>
              </label>
            </div>

            <label class="profile-template-field__description">
              <span>{{ t('填写提示', 'Field guidance') }}</span>
              <textarea
                v-model="field.description"
                rows="2"
                :placeholder="t('告诉用户这里应该填写什么。', 'Tell the user what belongs in this field.')"
              ></textarea>
            </label>

            <label v-if="supportsOptions(field)" class="profile-template-field__description">
              <span>{{ t('可选答案', 'Options') }}</span>
              <input
                v-model="field.optionsDraft"
                :data-testid="`worldbook-profile-field-options-${field.id}`"
                :placeholder="t('用逗号分隔，例如：艺人, 经纪人, 制作人', 'Separate with commas, for example: Artist, Manager, Producer')"
              />
            </label>

            <fieldset>
              <legend>{{ t('适用人物', 'People who use this field') }}</legend>
              <label v-for="option in entityTypeOptions" :key="option.value">
                <input
                  type="checkbox"
                  :checked="field.entityTypes.includes(option.value)"
                  @change="toggleFieldEntityType(field, option.value)"
                />
                <span>{{ option.label }}</span>
              </label>
            </fieldset>

            <fieldset>
              <legend>{{ t('额外使用范围', 'Additional uses') }}</legend>
              <p>{{ t('不勾选也仍是正常人物资料。', 'Without these, it is still normal profile information.') }}</p>
              <label
                v-for="option in purposeOptions"
                :key="option.value"
                :class="{ 'is-disabled': !purposeAllowed(field, option.value) }"
              >
                <input
                  type="checkbox"
                  :disabled="!purposeAllowed(field, option.value)"
                  :checked="field.purposes.includes(option.value)"
                  @change="toggleFieldPurpose(field, option.value)"
                />
                <span>{{ option.label }}</span>
              </label>
            </fieldset>

            <div class="profile-template-field__flags">
              <label>
                <input v-model="field.required" type="checkbox" />
                <span>{{ t('填写时标为必填', 'Mark as required') }}</span>
              </label>
              <label>
                <input v-model="field.recommended" type="checkbox" />
                <span>{{ t('默认推荐填写', 'Recommend by default') }}</span>
              </label>
            </div>
          </article>

          <button
            type="button"
            class="profile-template-editor__add-field"
            :data-testid="`worldbook-profile-add-field-${category.id}`"
            @click="addField(category.id, t('新字段', 'New field'))"
          >
            <i class="fas fa-plus" aria-hidden="true"></i>
            {{ t('在此类目添加字段', 'Add field to this category') }}
          </button>
        </div>
      </article>
    </div>

    <button
      type="button"
      class="profile-template-editor__add-category"
      data-testid="worldbook-profile-add-category"
      @click="addCategory(t('新类目', 'New category'))"
    >
      <i class="fas fa-layer-group" aria-hidden="true"></i>
      {{ t('添加资料类目', 'Add profile category') }}
    </button>

    <footer class="profile-template-editor__actions">
      <button type="button" data-testid="worldbook-profile-template-cancel" @click="emit('cancel')">
        {{ t('取消', 'Cancel') }}
      </button>
      <button
        type="button"
        class="is-primary"
        data-testid="worldbook-profile-template-save"
        :disabled="!canSave"
        @click="handleSave"
      >
        {{ isNew ? t('创建资料卡', 'Create profile card') : t('保存新版本', 'Save new version') }}
      </button>
    </footer>
  </section>
</template>

<style scoped>
.profile-template-editor {
  display: grid;
  gap: 14px;
  border: 1px solid var(--system-control-border);
  border-radius: var(--system-radius-lg);
  padding: 14px;
  color: var(--system-text);
  background: var(--system-panel-bg);
  box-shadow: var(--system-shadow-card);
}

.profile-template-editor__header,
.profile-template-category__head,
.profile-template-field__head,
.profile-template-editor__actions {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.profile-template-editor__header p,
.profile-template-editor__header h3,
.profile-template-editor__header span,
.profile-template-field__head span,
.profile-template-field__head strong {
  margin: 0;
}

.profile-template-editor__header p,
.profile-template-field__head span,
.profile-template-category__title > span,
.profile-template-editor label > span,
.profile-template-editor legend {
  color: var(--system-text-muted);
  font-size: 11px;
  font-weight: 750;
}

.profile-template-editor__header h3 {
  margin-top: 3px;
  font-size: 18px;
  line-height: 1.2;
}

.profile-template-editor__header > div > span {
  display: block;
  margin-top: 6px;
  max-width: 68ch;
  color: var(--system-text-muted);
  font-size: 12px;
  line-height: 1.45;
}

.profile-template-editor__version {
  flex: 0 0 auto;
  border: 1px solid var(--system-control-border);
  border-radius: 999px;
  padding: 6px 9px;
  color: var(--system-text-muted);
  background: var(--system-control-bg);
  font-size: 11px;
  font-weight: 750;
}

.profile-template-editor__identity,
.profile-template-editor__categories,
.profile-template-category,
.profile-template-category__fields,
.profile-template-field,
.profile-template-field__description,
.profile-template-category__title {
  display: grid;
  gap: 9px;
}

.profile-template-editor input,
.profile-template-editor textarea,
.profile-template-editor select {
  width: 100%;
  min-width: 0;
  border: 1px solid var(--system-control-border);
  border-radius: var(--system-radius-sm);
  padding: 9px 10px;
  color: var(--system-text);
  background: var(--system-control-bg);
  font: inherit;
  outline: none;
}

.profile-template-editor textarea {
  resize: vertical;
}

.profile-template-category {
  border: 1px solid var(--system-card-border);
  border-radius: var(--system-radius-md);
  padding: 12px;
  background: var(--system-surface-muted);
}

.profile-template-category__title {
  flex: 1 1 auto;
  grid-template-columns: auto minmax(160px, 360px);
  align-items: center;
}

.profile-template-category__description {
  background: var(--system-panel-bg) !important;
}

.profile-template-editor__icon-actions {
  display: flex;
  gap: 5px;
}

.profile-template-editor__icon-actions button {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border: 1px solid var(--system-control-border);
  border-radius: var(--system-radius-sm);
  color: var(--system-text-muted);
  background: var(--system-panel-bg);
}

.profile-template-editor button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.profile-template-editor button.is-danger,
.profile-template-category__delete-review button.is-danger {
  color: var(--system-danger);
}

.profile-template-field {
  border: 1px solid var(--system-control-border);
  border-radius: var(--system-radius-md);
  padding: 12px;
  background: var(--system-panel-bg);
}

.profile-template-field__head > div:first-child {
  display: grid;
  gap: 2px;
}

.profile-template-field__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 9px;
}

.profile-template-field__grid label,
.profile-template-editor__identity label {
  display: grid;
  gap: 5px;
}

.profile-template-editor fieldset {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin: 0;
  border: 0;
  padding: 0;
}

.profile-template-editor fieldset legend {
  width: 100%;
  margin-bottom: 1px;
}

.profile-template-editor fieldset > p {
  flex: 0 0 100%;
  margin: -2px 0 1px;
  color: var(--system-text-soft);
  font-size: 11px;
}

.profile-template-editor fieldset label,
.profile-template-field__flags label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--system-control-border);
  border-radius: 999px;
  padding: 6px 9px;
  background: var(--system-control-bg);
}

.profile-template-editor fieldset label.is-disabled {
  opacity: 0.45;
}

.profile-template-editor fieldset input,
.profile-template-field__flags input {
  width: auto;
  padding: 0;
}

.profile-template-field__flags {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.profile-template-editor__add-field,
.profile-template-editor__add-category {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  width: 100%;
  border: 1px dashed var(--system-control-border);
  border-radius: var(--system-radius-md);
  padding: 10px;
  color: var(--system-text-muted);
  background: transparent;
  font-weight: 700;
}

.profile-template-category__delete-review {
  display: grid;
  gap: 9px;
  border: 1px solid color-mix(in srgb, var(--system-danger) 34%, transparent);
  border-radius: var(--system-radius-md);
  padding: 10px;
  background: color-mix(in srgb, var(--system-danger) 7%, var(--system-panel-bg));
}

.profile-template-category__delete-review p {
  margin: 0;
  color: var(--system-text);
  font-size: 12px;
}

.profile-template-category__delete-review > div,
.profile-template-editor__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.profile-template-category__delete-review button,
.profile-template-editor__actions button {
  border: 1px solid var(--system-control-border);
  border-radius: var(--system-radius-sm);
  padding: 9px 12px;
  color: var(--system-text);
  background: var(--system-control-bg);
  font-weight: 750;
}

.profile-template-editor__actions button.is-primary {
  border-color: var(--system-accent);
  color: var(--system-accent-contrast, #fff);
  background: var(--system-accent);
}

@media (max-width: 640px) {
  .profile-template-editor__header,
  .profile-template-category__head,
  .profile-template-field__head,
  .profile-template-editor__actions {
    align-items: stretch;
    flex-direction: column;
  }

  .profile-template-editor__version {
    align-self: flex-start;
  }

  .profile-template-category__title,
  .profile-template-field__grid {
    grid-template-columns: 1fr;
  }

  .profile-template-editor__icon-actions {
    justify-content: flex-end;
  }

  .profile-template-editor__actions button {
    width: 100%;
  }
}
</style>
