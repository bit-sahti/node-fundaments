const express = require("express");
const { v4: uuid } = require("uuid");

//will serve as db;
const customers = [];

const app = express();

app.use(express.json());
// app.use(express.urlencoded({ extended: true }))

const getBalance = statement => {
  return statement.reduce((acc, statementLog) => {
    if (statementLog.type === 'credit') {
      acc += statementLog.amount
    } else {
      acc -= statementLog.amount
    }

    return acc
  }, 0)

}

//middleware
const verifyCPF = (req, res, next) => {
  const { cpf } = req.params;

  const customer = customers.find(customer => customer.cpf === cpf);

  if (!customer) {
      return res
          .status(400)
          .json({ message: 'Customer not found.' })
  }

  req.customer = customer; 

  return next()
}

//will need cpf, id (uuid), name, statement (extrato = [])
app.post("/account", (req, res) => {
  const { cpf, name } = req.body;
  console.log(req.body)

  const existingCpf = customers.some((customer) => customer.cpf === cpf);

  if (existingCpf) {
    return res
      .status(400)
      .json({ message: "Customer already exists" });
  }

  customers.push({ 
      cpf, 
      name,
      id: uuid(),
      statement: []
    });

  return res.status(201).send();
});

app.use('/:cpf', verifyCPF)

app.get('/:cpf/account', (req, res) => {
  return (res.json(req.customer))
})

app.put('/:cpf/account', (req, res) => {
  const { customer } = req;
  const { name } = req.body;

  customer.name = name;

  return res.status(201).send(customer);
})

app.delete('/:cpf/account', (req, res) => {
  const { customer } = req;

  const customerIndex = customers.findIndex(dbCustomer => dbCustomer.cpf === customer.cpf)

  customers.splice(customerIndex, 1)

  return res.status(204).send();
})

app.get('/:cpf/statement', (req, res) => {
    //200 já vai por padrão
    return res.json(req.customer.statement)
})

app.get('/:cpf/statement/date', (req, res) => {
  const { customer } = req;
  const { date } = req.query;

  const formattedDate = new Date(date).toLocaleDateString();

  const statements = customer.statement.filter(statementLog => {
    return new Date(statementLog.created_at).toLocaleDateString() === formattedDate
  })

  return res.json(statements)
})

app.post('/:cpf/deposit', (req, res) => {
  const { description, amount, type } = req.body;
  const { customer } = req;

  const statementOperation = {
    description,
    amount,
    created_at: new Date().toLocaleString(),
    type: "credit"
  }

  //req.customer is just an address, since arrays are non-primitive (copied by reference)
  customer.statement.push(statementOperation);

  res.status(201).send();
})

app.post('/:cpf/withdrawl', (req, res) => {
  const { customer } = req;
  const { description, amount } = req.body;
  const balance = getBalance(customer.statement);

  if (balance < amount) {
    return res.status(400).json({ message: 'Insuficient funds.'})
  }

  customer.statement.push({
    description,
    amount,
    type: 'debit',
    created_at: new Date().toLocaleString()
  })

  return res.status(201).send()

})

app.listen("3000");
