import express from 'express'
import { v4 as uuidv4 } from 'uuid'

const app = express()

const customers = []

app.use(express.json())

function getBalance(statement) {
	const balance = statement.reduce((acc, operation) => {
		if (operation.type === 'credit') {
			return acc + operation.amount
		} else {
			return acc - operation.amount
		}
	}, 0)

	return balance
}

// Middleware
function verifyExistsAccountCPF(request, response, next) {
	const { cpf } = request.headers

	const customer = customers.find((customer) => customer.cpf === parseInt(cpf))

	if (!customer) {
		return response.status(400).json({ error: 'customer not found' })
	}

	request.customer = customer

	return next()
}

// Routes
app.post('/account', (request, response) => {
	const { cpf, name } = request.body

	const customerAlreadyExists = customers.some(
		(customer) => customer.cpf === cpf,
	)

	if (customerAlreadyExists) {
		return response.status(400).json({
			error: 'Customer already exists!',
		})
	}

	customers.push({
		name,
		cpf,
		id: uuidv4(),
		statement: [],
	})

	return response.status(201).send()
})

app.put('/account', verifyExistsAccountCPF, (request, response) => {
	const { customer } = request
	const { name } = request.body

	customer.name = name

	return response.status(201).send()
})

app.get('/account', verifyExistsAccountCPF, (request, response) => {
	const { customer } = request

	return response.json(customer)
})

app.delete('/account', verifyExistsAccountCPF, (request, response) => {
	const { customer } = request

	customers.splice(customer, 1)

	return response.json(customers)
})

app.get('/statement', verifyExistsAccountCPF, (request, response) => {
	const { customer } = request

	return response.json(customer.statement)
})

app.get('/statement/date', verifyExistsAccountCPF, (request, response) => {
	const { customer } = request
	const { date } = request.query

	const dateFormat = new Date(date + ' 00:00')

	const statement = customer.statement.filter(
		(statement) =>
			statement.created_at.toDateString() ===
			new Date(dateFormat).toDateString(),
	)

	return response.json(statement)
})

app.post('/deposit', verifyExistsAccountCPF, (request, response) => {
	const { customer } = request
	const { description, amount } = request.body

	customer.statement.push({
		description,
		amount,
		created_at: new Date(),
		type: 'credit',
	})

	return response.status(201).send()
})

app.post('/withdraw', verifyExistsAccountCPF, (request, response) => {
	const { amount } = request.body
	const { customer } = request

	const balance = getBalance(customer.statement)

	if (balance < amount) {
		return response.status(400).json({ error: 'Insufficient funds!' })
	}

	customer.statement.push({
		amount,
		created_at: new Date(),
		type: 'debit',
	})

	return response.status(201).send()
})

app.get('/balance', verifyExistsAccountCPF, (request, response) => {
	const { customer } = request

	const balance = getBalance(customer.statement)

	return response.json(balance)
})

app.listen(3333, () => console.log('Server is running 🚀🚀'))
