import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useSchool } from '../context/SchoolContext'
import { useAsync } from '../hooks/useAsync'
import { Async } from '../components/Async'

/**
 * Student Records (Application Spec section 5). The roster is a way in, not a
 * destination: every row opens the learner's detail screen, where the record
 * can be corrected and their documents are listed.
 */
export default function StudentsScreen() {
  const { activeSchool } = useSchool()
  const navigate = useNavigate()
  const schoolId = activeSchool?.id
  const [query, setQuery] = useState('')

  const students = useAsync(() => (schoolId ? api.listStudents(schoolId) : Promise.resolve(null)), [schoolId])

  if (!schoolId) return <div className="notice">No school selected.</div>

  return (
    <>
      <div className="page-head">
        <h1>Student Records</h1>
        <p>{activeSchool?.name}</p>
      </div>

      <div className="filter-bar">
        <div className="field">
          <label htmlFor="q">Search</label>
          <input id="q" value={query} placeholder="Name or class" onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>

      <div className="card">
        <Async
          state={students}
          empty={{ when: (res) => !res || res.students.length === 0, message: 'No students on the roster yet.' }}
        >
          {(res) => {
            const term = query.trim().toLowerCase()
            const filtered = term
              ? res!.students.filter(
                  (s) =>
                    s.name.toLowerCase().includes(term) ||
                    (s.className ?? '').toLowerCase().includes(term) ||
                    (s.grade ?? '').toLowerCase().includes(term),
                )
              : res!.students

            if (filtered.length === 0) {
              return <div className="state">No students match “{query}”.</div>
            }

            return (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Grade</th>
                      <th>Class</th>
                      <th>Date of birth</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((student) => (
                      <tr
                        key={student.id}
                        className="clickable"
                        onClick={() => navigate(`/students/${student.id}`)}
                      >
                        <td className="cell-strong">{student.name}</td>
                        <td>{student.grade ?? '—'}</td>
                        <td>{student.className ?? '—'}</td>
                        <td className="cell-muted">
                          {student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString() : '—'}
                        </td>
                        <td className="cell-muted row-open" aria-hidden="true">
                          ›
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          }}
        </Async>
      </div>
    </>
  )
}
