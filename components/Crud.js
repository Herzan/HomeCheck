
'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { supabase } from '../lib/supabase';

// Reusable list and add form for HomeCheck database tables.
export default function Crud({
  table,
  title,
  fields,
  cols,
  base = {},
  uid,
  extra,
  onChange,
  order = 'created_at',

  // Optional search and empty-state settings.
  searchable = false,
  searchKeys = [],
  searchPlaceholder = 'Search records...',
  emptyMessage = 'No records have been added yet.',
}) {
  const [rows, setRows] = useState([]);
  const [f, setF] = useState({});
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  // Retrieve records belonging to the signed-in user.
  const load = useCallback(async () => {
    setLoading(true);
    setErr('');

    if (!uid) {
      setRows([]);
      setErr('A signed-in user is required to load records.');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('user_id', uid)
        .order(order, { ascending: false });

      if (error) throw error;

      setRows(data || []);
    } catch (error) {
      console.error(`Error loading ${table}:`, error);
      setRows([]);

      setErr(
        error.message || `Unable to load ${title}.`
      );
    } finally {
      setLoading(false);
    }
  }, [table, uid, order, title]);

  useEffect(() => {
    void load();
  }, [load]);

  // Filter records without making another database request.
  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return rows;

    return rows.filter((row) =>
      searchKeys.some((key) =>
        String(row[key] ?? '')
          .toLowerCase()
          .includes(term)
      )
    );
  }, [rows, search, searchKeys]);

  // Add a new record.
  async function add(e) {
    e.preventDefault();
    setErr('');
    setSaving(true);

    try {
      const row = {
        ...base,
        user_id: uid,
      };

      fields.forEach((field) => {
        if (
          f[field.k] !== undefined &&
          f[field.k] !== ''
        ) {
          row[field.k] = f[field.k];
        }
      });

      const { error } = await supabase
        .from(table)
        .insert(row);

      if (error) throw error;

      setF({});
      await load();

      if (onChange) await onChange();
    } catch (error) {
      console.error(`Error adding ${table}:`, error);

      setErr(
        error.message || `Unable to add ${title}.`
      );
    } finally {
      setSaving(false);
    }
  }

  // Delete a record belonging to the current user.
  async function del(id) {
    setErr('');

    try {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id)
        .eq('user_id', uid);

      if (error) throw error;

      await load();

      if (onChange) await onChange();
    } catch (error) {
      console.error(`Error deleting ${table}:`, error);

      setErr(
        error.message || 'Unable to delete this record.'
      );
    }
  }

  return (
    <div className="card">

      {/* SECTION HEADER */}

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 18,
      }}>
        <div>
          <h3 style={{ marginBottom: 5 }}>
            {title}
          </h3>

          <small style={{ color: '#64748b' }}>
            {rows.length} record{rows.length === 1 ? '' : 's'} registered
          </small>
        </div>

        <button
          type="button"
          className="sec"
          onClick={() => void load()}
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* ADD RECORD FORM */}

      <form
        onSubmit={add}
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 10,
          marginBottom: 20,
        }}
      >
        {fields.map((x) =>
          x.options ? (
            <select
              key={x.k}
              required={x.required}
              value={f[x.k] || ''}
              onChange={(e) =>
                setF({
                  ...f,
                  [x.k]: e.target.value,
                })
              }
            >
              <option value="">
                {x.label}
              </option>

              {x.options.map((o) => (
                <option key={o.v} value={o.v}>
                  {o.l}
                </option>
              ))}
            </select>
          ) : (
            <input
              key={x.k}
              type={x.type || 'text'}
              step="any"
              required={x.required}
              placeholder={x.label}
              title={x.label}
              value={f[x.k] || ''}
              onChange={(e) =>
                setF({
                  ...f,
                  [x.k]: e.target.value,
                })
              }
            />
          )
        )}

        <button type="submit" disabled={saving}>
          {saving ? 'Adding...' : 'Add'}
        </button>
      </form>

      {/* ERROR MESSAGE */}

      {err && (
        <div
          role="alert"
          style={{
            background: '#fef2f2',
            color: '#b91c1c',
            border: '1px solid #fecaca',
            borderRadius: 7,
            padding: 12,
            marginBottom: 15,
            fontSize: 13,
          }}
        >
          {err}
        </div>
      )}

      {/* SEARCH */}

      {searchable && (
        <div style={{ marginBottom: 18 }}>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            style={{
              width: '100%',
              maxWidth: 450,
              padding: 12,
              border: '1px solid #dbe2ea',
              borderRadius: 8,
              outline: 'none',
            }}
          />
        </div>
      )}

      {/* LOADING STATE */}

      {loading ? (
        <div
          role="status"
          style={{
            padding: 30,
            textAlign: 'center',
            color: '#64748b',
          }}
        >
          Loading {title.toLowerCase()}...
        </div>
      ) : (
        <>
          {/* EMPTY STATE */}

          {filteredRows.length === 0 ? (
            <div
              style={{
                padding: 35,
                textAlign: 'center',
                background: '#f8fafc',
                borderRadius: 9,
                color: '#64748b',
              }}
            >
              <div style={{
                fontSize: 35,
                marginBottom: 10,
              }}>
                {search ? '🔍' : '🏠'}
              </div>

              <strong style={{
                display: 'block',
                color: '#334155',
                marginBottom: 7,
              }}>
                {search
                  ? 'No matching records found'
                  : 'No appliances or records yet'}
              </strong>

              <p style={{
                fontSize: 13,
                margin: 0,
              }}>
                {search
                  ? 'Try searching with a different keyword.'
                  : emptyMessage}
              </p>

              {search && (
                <button
                  type="button"
                  className="sec"
                  style={{ marginTop: 12 }}
                  onClick={() => setSearch('')}
                >
                  Clear Search
                </button>
              )}
            </div>
          ) : (
            /* RECORD TABLE */

            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    {cols.map((c) => (
                      <th key={c.k}>{c.l}</th>
                    ))}
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredRows.map((row) => (
                    <tr key={row.id}>
                      {cols.map((c) => (
                        <td key={c.k}>
                          {c.f
                            ? c.f(row)
                            : String(row[c.k] ?? '')}
                        </td>
                      ))}

                      <td>
                        {extra && extra(row, load)}

                        <button
                          type="button"
                          className="del"
                          aria-label={`Delete record ${row.id}`}
                          onClick={() => del(row.id)}
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

    </div>
  );
}
